// src/screens/PaymentScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useStripe } from "@stripe/stripe-react-native";
import { supabase } from "../utils/supabase";

// URL de tu servidor (ngrok actual)
const SERVER_URL = "https://carolin-nonprovisional-correctly.ngrok-free.dev";

// Componente de input
const CustomInput = React.memo(
  ({
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType = "default",
    maxLength,
    theme,
    isProcessing,
    error,
  }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            borderColor: error ? "#EF4444" : theme.border,
            color: theme.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary + "80"}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={!isProcessing}
        selectionColor={theme.primary}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
);

export default function PaymentScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { courseId, amount: originalAmount, discount_price, courseTitle, courseThumbnail } = route.params || {};

  // Priorizar descuento
  const finalAmount = discount_price && discount_price < originalAmount 
    ? discount_price 
    : originalAmount || 0;

  if (!courseId || finalAmount === undefined) {
    Alert.alert("Error", "No se encontraron datos del curso");
    navigation.goBack();
    return null;
  }

  const taxes = finalAmount * 0.16;
  const totalWithTaxes = finalAmount + taxes;

  const [form, setForm] = useState({
    cp: "",
    estado: "",
    municipio: "",
    localidad: "",
    colonia: "",
    nombre: user?.name || "",
    telefono: user?.phone || "",
    tipoDomicilio: "Residencial",
  });

  const [errors, setErrors] = useState({});
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  // Función de validación (se llama manualmente)
  const validateForm = () => {
    const newErrors = {};

    if (!/^\d{5}$/.test(form.cp.trim()))
      newErrors.cp = "Código postal inválido (5 dígitos)";
    if (!/^\d{10}$/.test(form.telefono.trim()))
      newErrors.telefono = "Teléfono inválido (10 dígitos)";
    if (!form.estado.trim()) newErrors.estado = "Estado es requerido";
    if (!form.municipio.trim()) newErrors.municipio = "Municipio es requerido";
    if (!form.colonia.trim()) newErrors.colonia = "Colonia es requerida";
    if (!form.nombre.trim()) newErrors.nombre = "Nombre es requerido";
    if (!form.localidad.trim()) newErrors.localidad = "Localidad es requerida";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormField = (field, value) => {
    setForm((prev) => {
      const newForm = { ...prev, [field]: value };
      // Validar en tiempo real (opcional, pero útil)
      validateForm(); // Se llama aquí para actualizar errores al escribir
      return newForm;
    });
  };

  const handlePressContinuar = async () => {
    if (!validateForm()) {
      setShowAlertModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Caso gratis
      if (finalAmount === 0) {
        await enrollAfterPayment();
        Alert.alert(
          "¡Inscripción completada!",
          "Te has inscrito gratis al curso.",
          [
            { text: "Ver curso", onPress: () => navigation.navigate("CourseDetail", { courseId }) },
            { text: "OK", onPress: () => navigation.navigate("StudentTabs") },
          ]
        );
        return;
      }

      // Crear PaymentIntent
      const response = await fetch(`${SERVER_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalWithTaxes,
          currency: "mxn",
          userId: user.id,
          courseId,
          courseTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error del servidor al crear pago");
      }

      if (!data.clientSecret) {
        throw new Error("No se recibió clientSecret");
      }

      setClientSecret(data.clientSecret);

      // Inicializar Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Tu Plataforma de Cursos",
        paymentIntentClientSecret: data.clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: form.nombre,
          email: user?.email || "no-reply@example.com",
        },
      });

      if (initError) {
        throw new Error(`Error configurando pago: ${initError.message}`);
      }

      setShowCardModal(true);
    } catch (err) {
      console.error("Error inicializando pago:", err);
      Alert.alert("Error", err.message || "No pudimos preparar el pago.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!clientSecret) return;

    setIsProcessing(true);

    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === "Canceled") {
          Alert.alert("Pago cancelado");
        } else {
          Alert.alert("Error en el pago", error.message);
        }
        return;
      }

      await enrollAfterPayment();

      Alert.alert(
        "¡Pago exitoso!",
        `Te has inscrito al curso "${courseTitle}" por $${totalWithTaxes.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
        [
          { text: "Ver curso", onPress: () => navigation.navigate("CourseDetail", { courseId }) },
          { text: "OK", onPress: () => navigation.navigate("StudentTabs") },
        ]
      );
    } catch (err) {
      console.error("Error procesando pago:", err);
      Alert.alert("Error", "Hubo un problema con el pago");
    } finally {
      setIsProcessing(false);
      setShowCardModal(false);
    }
  };

  const enrollAfterPayment = async () => {
    try {
      const { error } = await supabase.from("enrollments").insert({
        client_id: user.id,
        course_id: courseId,
        price_paid: totalWithTaxes,
        payment_status: "paid",
        enrolled_at: new Date().toISOString(),
      });

      if (error) throw error;
      console.log("Inscripción creada exitosamente");
    } catch (err) {
      console.error("Error inscribiendo tras pago:", err);
    }
  };

  const renderCardModal = () => (
    <Modal visible={showCardModal} transparent animationType="slide">
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Confirmar pago con tarjeta
          </Text>

          <View style={[styles.modalTotalBox, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Total a pagar (incluye IVA):
            </Text>
            <Text style={[styles.modalTotalValue, { color: colors.primary }]}>
              ${totalWithTaxes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <Text style={[styles.modalInfoText, { color: colors.textSecondary, marginTop: 20 }]}>
            Tu pago será procesado de forma segura con Stripe
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.btnFlex, { backgroundColor: colors.card }]}
              onPress={() => setShowCardModal(false)}
              disabled={isProcessing}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnFlex,
                { backgroundColor: colors.primary, opacity: isProcessing ? 0.5 : 1 },
              ]}
              onPress={handleProcessPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.btnTextWhite}>Pagar ahora</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {renderCardModal()}

      <Modal visible={showAlertModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalAlertContent, { backgroundColor: colors.card }]}>
            <Icon name="alert-circle" size={50} color="#EF4444" />
            <Text style={[styles.modalAlertTitle, { color: colors.text }]}>
              Datos incompletos
            </Text>
            <Text style={[styles.modalAlertText, { color: colors.textSecondary }]}>
              {Object.values(errors).filter(Boolean).join("\n") || "Revisa los campos requeridos"}
            </Text>
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: colors.primary }]}
              onPress={() => setShowAlertModal(false)}
            >
              <Text style={styles.btnTextWhite}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Finalizar Inscripción
          </Text>

          {/* Resumen del Curso */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardHeader, { color: colors.text }]}>
                Resumen del Curso
              </Text>
            </View>

            <View style={styles.productRow}>
              {courseThumbnail ? (
                <Image source={{ uri: courseThumbnail }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { backgroundColor: colors.border }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                  {courseTitle || "Curso"}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {finalAmount > 0 ? "Curso de pago" : "Gratis"}
                </Text>
              </View>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                ${finalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Subtotal:</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                ${finalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>IVA (16%):</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                ${taxes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text, fontWeight: "bold" }]}>
                Total a pagar:
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary, fontWeight: "bold" }]}>
                ${totalWithTaxes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Datos de Contacto */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardHeader, { color: colors.text }]}>
                Datos de contacto
              </Text>
              <Icon name="account-circle" size={20} color={colors.primary} />
            </View>

            <CustomInput
              label="CÓDIGO POSTAL *"
              placeholder="5 dígitos (ej: 01000)"
              value={form.cp}
              onChangeText={(t) => updateFormField("cp", t)}
              keyboardType="numeric"
              maxLength={5}
              theme={colors}
              isProcessing={isProcessing}
              error={errors.cp}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <CustomInput
                  label="ESTADO *"
                  placeholder="Estado"
                  value={form.estado}
                  onChangeText={(t) => updateFormField("estado", t)}
                  theme={colors}
                  isProcessing={isProcessing}
                  error={errors.estado}
                />
              </View>
              <View style={styles.halfInput}>
                <CustomInput
                  label="MUNICIPIO *"
                  placeholder="Municipio"
                  value={form.municipio}
                  onChangeText={(t) => updateFormField("municipio", t)}
                  theme={colors}
                  isProcessing={isProcessing}
                  error={errors.municipio}
                />
              </View>
            </View>

            <CustomInput
              label="LOCALIDAD *"
              placeholder="Escribe aquí tu localidad"
              value={form.localidad}
              onChangeText={(t) => updateFormField("localidad", t)}
              theme={colors}
              isProcessing={isProcessing}
              error={errors.localidad}
            />

            <CustomInput
              label="COLONIA *"
              placeholder="Escribe aquí tu colonia"
              value={form.colonia}
              onChangeText={(t) => updateFormField("colonia", t)}
              theme={colors}
              isProcessing={isProcessing}
              error={errors.colonia}
            />

            <Text style={[styles.cardHeaderSmall, { color: colors.text }]}>
              Información personal
            </Text>

            <CustomInput
              label="NOMBRE COMPLETO *"
              placeholder="Escribe tu nombre completo"
              value={form.nombre}
              onChangeText={(t) => updateFormField("nombre", t)}
              theme={colors}
              isProcessing={isProcessing}
              error={errors.nombre}
            />

            <CustomInput
              label="TELÉFONO *"
              placeholder="10 dígitos (ej: 5512345678)"
              value={form.telefono}
              onChangeText={(t) => updateFormField("telefono", t)}
              keyboardType="phone-pad"
              maxLength={10}
              theme={colors}
              isProcessing={isProcessing}
              error={errors.telefono}
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
              TIPO DE DOMICILIO
            </Text>
            <View style={styles.radioGroup}>
              {["Residencial", "Oficina", "Comercial"].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.radioOption,
                    {
                      backgroundColor: form.tipoDomicilio === tipo ? colors.primary : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => updateFormField("tipoDomicilio", tipo)}
                  disabled={isProcessing}
                >
                  <Text
                    style={[
                      styles.radioText,
                      { color: form.tipoDomicilio === tipo ? "#FFF" : colors.text },
                    ]}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.totalInfo}>
            <Text style={[styles.totalSub, { color: colors.textSecondary }]}>
              Total Final
            </Text>
            <Text style={[styles.totalBig, { color: colors.primary }]}>
              ${totalWithTaxes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.btnPay,
              {
                backgroundColor: colors.primary,
                opacity: validateForm() && !isProcessing ? 1 : 0.5,
              },
            ]}
            onPress={handlePressContinuar}
            disabled={!validateForm() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.btnPayText}>Confirmar Inscripción</Text>
                <Icon name="chevron-right" size={24} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  mainTitle: { fontSize: 28, fontWeight: "900", marginBottom: 25 },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardHeader: { fontSize: 18, fontWeight: "800" },
  cardHeaderSmall: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 10,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 15,
    backgroundColor: "#E2E8F0",
  },
  productName: { fontWeight: "700", fontSize: 15, flex: 1 },
  productPrice: { fontWeight: "800", fontSize: 16 },
  divider: { height: 1, marginVertical: 15 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: "600" },
  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  row: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  radioGroup: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  radioText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === "android" ? 25 : 40,
    borderTopWidth: 1,
  },
  totalInfo: { flex: 1 },
  totalSub: { fontSize: 12, fontWeight: "600" },
  totalBig: { fontSize: 26, fontWeight: "900" },
  btnPay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPayText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 17,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalAlertContent: {
    width: "85%",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    elevation: 10,
  },
  modalAlertTitle: { fontSize: 22, fontWeight: "900", marginTop: 15 },
  modalAlertText: {
    textAlign: "center",
    marginVertical: 15,
    fontSize: 15,
    lineHeight: 22,
  },
  btnAction: {
    width: "100%",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnTextWhite: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  modalSheet: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    alignItems: "center",
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 15,
    textAlign: "center",
  },
  modalTotalBox: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    marginVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTotalValue: { fontSize: 36, fontWeight: "900", marginTop: 5 },
  modalInfoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  btnFlex: {
    flex: 1,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
});