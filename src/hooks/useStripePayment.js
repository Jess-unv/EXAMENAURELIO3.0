import { useState } from "react";
import { Alert } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { useAuth } from "../context/AuthContext";

const SERVER_URL = "https://carolin-nonprovisional-correctly.ngrok-free.dev"; // ← Cámbiala si ngrok expira

export const usePaymentStripe = () => {
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useAuth();

  const createPaymentIntent = async ({
    courseId,
    courseTitle,
    userId: providedUserId,
  }) => {
    try {
      const finalUserId = providedUserId || user?.id;

      if (!finalUserId) {
        throw new Error("No se encontró ID de usuario");
      }

      if (!courseId) {
        throw new Error("courseId es requerido");
      }

      console.log(
        "[usePaymentStripe] Creando PaymentIntent para curso:",
        courseId,
        "usuario:",
        finalUserId,
        "URL:",
        `${SERVER_URL}/create-payment-intent`,
      );

      const response = await fetch(`${SERVER_URL}/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          userId: finalUserId,
          courseTitle: courseTitle || "Curso sin título",
        }),
      });

      console.log(
        "[usePaymentStripe] Respuesta del servidor - Status:",
        response.status,
        "OK:",
        response.ok,
      );

      // Intentamos leer como texto primero para debug
      let responseText;
      try {
        responseText = await response.text();
      } catch (textErr) {
        responseText = "No se pudo leer la respuesta";
      }

      // Si no es OK, mostramos qué devolvió realmente
      if (!response.ok) {
        console.log(
          "[usePaymentStripe] Error del servidor - Raw response (primeros 300 chars):",
          responseText.substring(0, 300),
        );

        let errorMessage = "Error del servidor al crear el intento de pago";

        // Detectar si es HTML (ngrok caído, 502, etc.)
        if (
          responseText.includes("<!DOCTYPE") ||
          responseText.includes("<html")
        ) {
          errorMessage = "No se pudo conectar al servidor. ¿Ngrok está activo?";
        } else {
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // No es JSON → probablemente HTML o texto plano
          }
        }

        throw new Error(errorMessage);
      }

      // Si llegó aquí, intentamos parsear JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error(
          "[usePaymentStripe] Falló parseo JSON. Respuesta cruda:",
          responseText.substring(0, 300),
        );
        throw new Error(
          "El servidor devolvió una respuesta inválida (no JSON)",
        );
      }

      if (!result.clientSecret) {
        throw new Error("No se recibió clientSecret del servidor");
      }

      console.log("[usePaymentStripe] PaymentIntent creado exitosamente:", {
        clientSecret: result.clientSecret.substring(0, 10) + "...",
        // id: result.paymentIntentId,
        // montoFinal: result.amount,
        // descuento: result.discountPercentage,
      });

      return result;
    } catch (error) {
      console.error(
        "[usePaymentStripe] Error completo creando PaymentIntent:",
        error,
      );
      throw error;
    }
  };

  const payWithPaymentSheet = async ({ courseId, courseTitle, userId }) => {
    setLoading(true);

    try {
      console.log(
        "[usePaymentStripe] Iniciando proceso de pago para curso:",
        courseId,
      );

      const {
        clientSecret,
        paymentIntentId,
        amount,
        originalAmount,
        discountPercentage,
      } = await createPaymentIntent({
        courseId,
        courseTitle,
        userId,
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Tu Academia",
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user?.name || "Estudiante",
          email: user?.email || "",
        },
        appearance: {
          colors: {
            primary: "#3b82f6",
            background: "#ffffff",
            componentBackground: "#f8fafc",
            componentBorder: "#e2e8f0",
            componentText: "#0f172a",
          },
        },
      });

      if (initError) {
        throw new Error(
          `Error al inicializar Payment Sheet: ${initError.message}`,
        );
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          console.log("El usuario canceló el pago");
          return { success: false, canceled: true };
        }
        throw new Error(
          presentError.message || "Error al presentar Payment Sheet",
        );
      }

      console.log("Pago completado exitosamente", {
        paymentIntentId,
        montoPagado: amount,
      });

      setLoading(false);

      return {
        success: true,
        paymentIntentId,
        amount,
        originalAmount,
        discountPercentage,
        message: "Pago completado exitosamente",
      };
    } catch (error) {
      setLoading(false);
      console.error(
        "[usePaymentStripe] Error completo en payWithPaymentSheet:",
        error,
      );

      Alert.alert(
        "Error en el pago",
        error.message || "No se pudo completar el pago. Intenta de nuevo.",
        [{ text: "OK" }],
      );

      return {
        success: false,
        error: error.message,
      };
    }
  };

  return {
    payWithPaymentSheet,
    loading,
  };
};
