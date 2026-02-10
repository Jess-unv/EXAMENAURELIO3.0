import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useStripe } from "@stripe/stripe-react-native";

const SERVER_URL = "https://carolin-nonprovisional-correctly.ngrok-free.dev"; // ← CAMBIA esto por la URL real de tu servidor (ej: https://tu-servidor.onrender.com)

export default function PaymentScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { courseId, courseTitle, courseThumbnail } = route.params || {};

  const [course, setCourse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [finalAmount, setFinalAmount] = useState(0);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId) {
        Alert.alert("Error", "No se encontraron datos del curso");
        navigation.goBack();
        return;
      }

      setLoadingDetails(true);

      try {
        const { data, error } = await supabase
          .from("courses")
          .select(
            `
            id,
            title,
            description,
            price,
            discount_price,
            duration_hours,
            language,
            is_published,
            thumbnail_url,
            level:levels(name),
            category:categories(name)
          `,
          )
          .eq("id", courseId)
          .single();

        if (error || !data || !data.is_published) {
          throw new Error("Curso no encontrado o no publicado");
        }

        const original = parseFloat(data.price) || 0;
        const discounted = data.discount_price
          ? parseFloat(data.discount_price)
          : original;
        const amount = discounted > 0 ? discounted : original;

        setCourse(data);
        setOriginalAmount(original);
        setFinalAmount(amount);
        setDiscountAmount(original - amount);
      } catch (err) {
        console.error("Error cargando curso:", err);
        Alert.alert("Error", "No se pudo cargar los detalles del curso");
        navigation.goBack();
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchCourseDetails();
  }, [courseId, navigation]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          userId: user.id,
          courseTitle: courseTitle || course?.title || "Curso",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error en el servidor");
      }

      return data.clientSecret;
    } catch (err) {
      console.error("Error creando PaymentIntent:", err);
      Alert.alert("Error", "No pudimos preparar el pago: " + err.message);
      return null;
    }
  };

  const handlePay = async () => {
    if (finalAmount === 0) {
      // Curso gratuito - inscribe directamente
      setIsProcessing(true);
      try {
        await enrollAfterPayment(0);
        Alert.alert(
          "¡Inscripción completada!",
          `Te has inscrito al curso "${courseTitle || course?.title || "Curso"}" gratuitamente`,
          [
            {
              text: "Ver curso",
              onPress: () => navigation.navigate("CourseDetail", { courseId }),
            },
            { text: "OK", onPress: () => navigation.navigate("StudentTabs") },
          ],
        );
      } catch (err) {
        Alert.alert("Error", "No se pudo inscribir al curso gratuito");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);

    try {
      const clientSecret = await createPaymentIntent();
      if (!clientSecret) return;

      // Inicializar PaymentSheet con Google Pay habilitado
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Tu Academia",
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        googlePay: {
          enabled: true,
          testEnv: __DEV__, // true en desarrollo, false en producción
          merchantName: "Tu Academia",
          merchantCountryCode: "MX",
        },
        appearance: {
          colors: {
            primary: colors.primary,
            background: colors.background,
            componentBackground: colors.card,
            componentBorder: colors.border,
            componentText: colors.text,
          },
        },
      });

      if (initError) {
        Alert.alert(
          "Error",
          initError.message || "No se pudo preparar el pago",
        );
        return;
      }

      // Mostrar PaymentSheet (aquí aparece Google Pay si está disponible)
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert("Pago cancelado");
        } else {
          Alert.alert("Error en pago", presentError.message);
        }
        return;
      }

      // Pago exitoso → inscribe al usuario
      await enrollAfterPayment(finalAmount);

      Alert.alert(
        "¡Pago e inscripción completados!",
        `Te has inscrito al curso "${courseTitle || course?.title || "Curso"}" por $${finalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
        [
          {
            text: "Ver curso",
            onPress: () => navigation.navigate("CourseDetail", { courseId }),
          },
          { text: "OK", onPress: () => navigation.navigate("StudentTabs") },
        ],
      );
    } catch (err) {
      console.error("Error en pago:", err);
      Alert.alert("Error", err.message || "Hubo un problema con el pago");
    } finally {
      setIsProcessing(false);
    }
  };

  const enrollAfterPayment = async (pricePaid) => {
    try {
      const { error } = await supabase.from("enrollments").insert({
        client_id: user.id,
        course_id: courseId,
        price_paid: pricePaid,
        payment_status: "paid",
        enrolled_at: new Date().toISOString(),
      });

      if (error) throw error;
      console.log("Inscripción creada exitosamente");
    } catch (err) {
      console.error("Error inscribiendo:", err);
      throw err;
    }
  };

  const styles = createStyles(colors, isDarkMode);

  if (loadingDetails) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Cargando detalles del curso...
        </Text>
      </View>
    );
  }

  if (!course) return null;

  const hasDiscount = discountAmount > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          Finalizar Inscripción
        </Text>

        {/* Tarjeta de resumen del curso */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Resumen del Curso
          </Text>

          <View style={styles.courseHeader}>
            {courseThumbnail ? (
              <Image
                source={{ uri: courseThumbnail }}
                style={styles.courseImage}
              />
            ) : (
              <View
                style={[styles.courseImage, { backgroundColor: colors.border }]}
              />
            )}
            <View style={styles.courseInfo}>
              <Text
                style={[styles.courseTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {courseTitle || course.title || "Curso"}
              </Text>
              <View style={styles.courseMeta}>
                {course.level?.name && (
                  <View style={styles.metaTag}>
                    <Icon
                      name="school"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{course.level.name}</Text>
                  </View>
                )}
                {course.category?.name && (
                  <View style={styles.metaTag}>
                    <Icon name="tag" size={14} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{course.category.name}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {course.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {course.description}
            </Text>
          )}

          <View style={styles.detailsRow}>
            {course.duration_hours && (
              <View style={styles.detailItem}>
                <Icon name="clock-outline" size={18} color={colors.primary} />
                <Text style={styles.detailText}>
                  {course.duration_hours} horas
                </Text>
              </View>
            )}
            {course.language && (
              <View style={styles.detailItem}>
                <Icon name="translate" size={18} color={colors.primary} />
                <Text style={styles.detailText}>{course.language}</Text>
              </View>
            )}
          </View>

          {/* Precio con descuento */}
          <View style={styles.priceSection}>
            {hasDiscount ? (
              <>
                <Text style={styles.originalPrice}>
                  $
                  {originalAmount.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
                <Text style={[styles.finalPrice, { color: colors.primary }]}>
                  $
                  {finalAmount.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.discountBadge}>
                  Ahorras $
                  {discountAmount.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </>
            ) : finalAmount > 0 ? (
              <Text style={[styles.finalPrice, { color: colors.primary }]}>
                $
                {finalAmount.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            ) : (
              <Text style={[styles.freeText, { color: colors.success }]}>
                Curso Gratuito
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Botón de pago fijo abajo */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.totalInfo}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total a pagar
          </Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            ${finalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            {
              backgroundColor:
                finalAmount === 0 ? colors.success : colors.primary,
              opacity: isProcessing ? 0.6 : 1,
            },
          ]}
          onPress={handlePay}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              {finalAmount === 0 ? "Inscribirse gratis" : "Pagar ahora"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 140 },
    mainTitle: {
      fontSize: 28,
      fontWeight: "900",
      marginBottom: 25,
      textAlign: "center",
    },
    card: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
    courseHeader: { flexDirection: "row", marginBottom: 16 },
    courseImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
    courseInfo: { flex: 1 },
    courseTitle: { fontSize: 18, fontWeight: "bold" },
    courseMeta: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
    metaTag: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 12,
      marginBottom: 4,
    },
    metaText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
    description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
    detailsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 16,
      marginBottom: 8,
    },
    detailText: { fontSize: 14, marginLeft: 6, color: colors.text },
    priceSection: {
      alignItems: "center",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    originalPrice: {
      fontSize: 16,
      color: colors.textTertiary,
      textDecorationLine: "line-through",
    },
    finalPrice: { fontSize: 28, fontWeight: "bold" },
    discountBadge: {
      fontSize: 14,
      color: colors.success,
      marginTop: 4,
      fontWeight: "600",
    },
    freeText: { fontSize: 24, fontWeight: "bold", color: colors.success },
    bottomNav: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
    },
    totalInfo: { flex: 1 },
    totalLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    totalAmount: { fontSize: 28, fontWeight: "900", color: colors.primary },
    payButton: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 160,
    },
    payButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  });
