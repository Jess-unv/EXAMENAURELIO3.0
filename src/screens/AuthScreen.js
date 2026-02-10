import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  StatusBar,
  Easing,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Colores unificados con tu app
const THEME_COLORS = {
  primary: "#6366f1",
  secondary: "#a855f7",
  error: "#EF4444",
  success: "#10B981",
  errorGradient: ["#EF4444DD", "#EF4444"], // Gradiente rojo con transparencia para que se vea premium
};

export default function AuthScreen() {
  const { colors, isDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Popup genérico para validaciones locales (campos vacíos, etc.)
  const [notif, setNotif] = useState({ msg: "", type: "error" });
  const notifAnim = useRef(new Animated.Value(-150)).current;
  const notifTimer = useRef(null);

  // Alerta ESPECÍFICA para error de login (credenciales malas)
  // Aparece 2 segundos y se quita sola, con diseño bonito
  const [loginError, setLoginError] = useState("");
  const loginErrorAnim = useRef(new Animated.Value(-150)).current;
  const loginErrorTimer = useRef(null);

  const { signUp, signIn, loading: authLoading } = useAuth();

  // Popup genérico (para otros mensajes)
  const showPopup = (msg, type = "error") => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifAnim.stopAnimation();
    setNotif({ msg: msg.toUpperCase(), type });
    Vibration.vibrate(type === "error" ? [0, 50, 50, 50] : 20);

    Animated.spring(notifAnim, {
      toValue: Platform.OS === "ios" ? 60 : 30,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    notifTimer.current = setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: -150,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 3000);
  };

  // Alerta de login fallido: gradiente rojo + blur, se quita sola en 2s
  const showLoginError = (message) => {
    if (loginErrorTimer.current) clearTimeout(loginErrorTimer.current);
    loginErrorAnim.stopAnimation();

    setLoginError(message || "EMAIL O CONTRASEÑA INCORRECTOS");

    // Entrada con spring suave
    Animated.spring(loginErrorAnim, {
      toValue: Platform.OS === "ios" ? 60 : 30,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Desaparece sola después de 2000ms
    loginErrorTimer.current = setTimeout(() => {
      Animated.timing(loginErrorAnim, {
        toValue: -150,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => setLoginError(""));
    }, 2000);

    Vibration.vibrate([0, 50, 50, 50]);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      showPopup("RELLENA TODOS LOS CAMPOS");
      return;
    }
    if (isRegister) {
      if (!formData.name) {
        showPopup("INGRESA TU NOMBRE");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showPopup("LAS CONTRASEÑAS NO COINCIDEN");
        return;
      }
      if (formData.password.length < 6) {
        showPopup("MÍNIMO 6 CARACTERES");
        return;
      }
    }

    try {
      let result = isRegister
        ? await signUp(
            formData.email,
            formData.password,
            formData.name,
            "client",
          )
        : await signIn(formData.email, formData.password);

      if (result.success) {
        showPopup(result.message || "ÉXITO", "success");
        setFormData({ email: "", password: "", confirmPassword: "", name: "" });
        if (result.needsEmailVerification) {
          showPopup("VERIFICA TU CORREO", "success");
        }
      } else {
        // Error de credenciales → alerta animada bonita que se quita sola
        showLoginError(result.error);
      }
    } catch (error) {
      showLoginError("ERROR INESPERADO. INTENTA DE NUEVO.");
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRegister]);

  const renderInput = (
    field,
    icon,
    placeholder,
    isPass = false,
    state,
    setState,
  ) => (
    <View
      style={[
        styles.inputGroup,
        { backgroundColor: isDarkMode ? "#1A1A1A" : "#F5F7FA" },
      ]}
    >
      <Ionicons name={icon} size={20} color={THEME_COLORS.primary} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={isPass && !state}
        value={formData[field]}
        onChangeText={(v) => handleInputChange(field, v)}
        autoCapitalize="none"
      />
      {isPass && (
        <TouchableOpacity onPress={() => setState(!state)}>
          <Ionicons
            name={state ? "eye" : "eye-off"}
            size={20}
            color="#94A3B8"
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* POPUP GENÉRICO (para validaciones locales) */}
      <Animated.View
        style={[
          styles.popup,
          {
            transform: [{ translateY: notifAnim }],
            backgroundColor:
              notif.type === "error"
                ? THEME_COLORS.error
                : THEME_COLORS.success,
          },
        ]}
      >
        <Text style={styles.popupText}>{notif.msg}</Text>
      </Animated.View>

      {/* ALERTA DE ERROR DE LOGIN (gradiente rojo + blur, sin botón, 2 segundos) */}
      {loginError ? (
        <Animated.View
          style={[
            styles.loginErrorAlert,
            {
              transform: [{ translateY: loginErrorAnim }],
            },
          ]}
        >
          <BlurView
            intensity={90}
            tint={isDarkMode ? "dark" : "light"}
            style={styles.blurContainer}
          >
            <LinearGradient
              colors={THEME_COLORS.errorGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.errorGradient}
            >
              <Text style={styles.errorText}>{loginError}</Text>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER DE MARCA */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <Text style={[styles.brandName, { color: colors.text }]}>
              ACADEMY<Text style={{ color: THEME_COLORS.primary }}>PRO</Text>
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: THEME_COLORS.primary + "15" },
              ]}
            >
              <Text style={[styles.badgeText, { color: THEME_COLORS.primary }]}>
                CURSOS DE PROGRAMACIÓN
              </Text>
            </View>
          </Animated.View>

          {/* TARJETA GLASSMORPHISM */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isRegister ? "CREAR CUENTA" : "INICIAR SESIÓN"}
            </Text>

            {isRegister &&
              renderInput("name", "person-outline", "NOMBRE COMPLETO")}
            {renderInput("email", "mail-outline", "CORREO ELECTRÓNICO")}
            {renderInput(
              "password",
              "lock-closed-outline",
              "CONTRASEÑA",
              true,
              showPassword,
              setShowPassword,
            )}
            {isRegister &&
              renderInput(
                "confirmPassword",
                "shield-checkmark-outline",
                "CONFIRMAR",
                true,
                showConfirmPassword,
                setShowConfirmPassword,
              )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSubmit}
              disabled={authLoading}
            >
              <LinearGradient
                colors={[THEME_COLORS.primary, THEME_COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.buttonText}>
                  {authLoading
                    ? "PROCESANDO..."
                    : isRegister
                      ? "REGISTRARME"
                      : "ENTRAR"}
                </Text>
                {!authLoading && (
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setIsRegister(!isRegister);
                setFormData({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  name: "",
                });
              }}
            >
              <Text
                style={[styles.switchText, { color: colors.textSecondary }]}
              >
                {isRegister ? "¿YA TIENES CUENTA? " : "¿ERES NUEVO? "}
                <Text
                  style={{ color: THEME_COLORS.primary, fontWeight: "900" }}
                >
                  {isRegister ? "INICIA SESIÓN" : "CREAR CUENTA"}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 30, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 50 },
  brandName: { fontSize: 34, fontWeight: "900", letterSpacing: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  card: {
    borderRadius: 32,
    padding: 25,
    borderWidth: 1,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 25,
    letterSpacing: 1,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 62,
    marginBottom: 15,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: "600" },
  actionButton: {
    marginTop: 15,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 5,
  },
  btnGradient: {
    height: 62,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  switchMode: { marginTop: 25, alignItems: "center" },
  switchText: { fontSize: 13, fontWeight: "700" },
  popup: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
    padding: 18,
    borderRadius: 20,
  },
  popupText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
  },

  // ALERTA DE ERROR DE LOGIN (gradiente rojo + blur, se quita sola en 2s)
  loginErrorAlert: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10000,
    marginTop: Platform.OS === "ios" ? 50 : 20,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  errorGradient: {
    paddingVertical: 18,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  errorMessage: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
  },
});
