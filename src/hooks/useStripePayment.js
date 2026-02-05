// src/hooks/usePaymentStripe.js  (o donde lo tengas)
import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

// URL de tu servidor (usa la de ngrok que te di antes)
const SERVER_URL = 'https://carolin-nonprovisional-correctly.ngrok-free.dev';

export const usePaymentStripe = () => {
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Función para crear el PaymentIntent (llama a tu servidor)
  const createPaymentIntent = async ({ amount, courseId, courseTitle, userId }) => {
    try {
      console.log('📤 Creando PaymentIntent para curso:', courseId);

      const response = await fetch(`${SERVER_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,           // ya debe venir con IVA si lo calculaste
          currency: 'mxn',
          userId,
          courseId,
          courseTitle: courseTitle || 'Curso sin título',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.clientSecret) {
        throw new Error(result.error || 'Error del servidor al crear pago');
      }

      console.log('✅ PaymentIntent creado:', result.paymentIntentId);
      return result;

    } catch (error) {
      console.error('❌ Error creando PaymentIntent:', error);
      throw error;
    }
  };

  // Función principal: procesar pago con Payment Sheet
  const payWithPaymentSheet = async ({ amount, courseId, courseTitle, userId }) => {
    setLoading(true);

    try {
      console.log('🚀 Iniciando pago con PaymentSheet para curso:', courseId);

      // 1. Crear PaymentIntent en tu servidor
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        amount,
        courseId,
        courseTitle,
        userId,
      });

      // 2. Inicializar Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Tu Academia',
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Usuario', // puedes pasar nombre real si lo tienes
          email: 'usuario@email.com', // opcional
        },
        // Opcional: estilo oscuro/claro según tu tema
        appearance: {
          colors: {
            primary: '#3b82f6',
            background: '#ffffff',
            componentBackground: '#f8fafc',
            componentBorder: '#e2e8f0',
            componentText: '#0f172a',
          },
        },
      });

      if (initError) {
        throw new Error(`Error configurando Payment Sheet: ${initError.message}`);
      }

      // 3. Mostrar Payment Sheet al usuario
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          console.log('👤 Usuario canceló el pago');
          return { success: false, canceled: true };
        }
        throw new Error(presentError.message || 'Error al mostrar Payment Sheet');
      }

      // 4. Pago exitoso
      console.log('✅ Pago exitoso! PaymentIntent:', paymentIntentId);

      // Aquí NO necesitas llamar a /confirm-payment porque ya haces la inscripción en el frontend
      // (en enrollAfterPayment de PaymentScreen)

      setLoading(false);
      return {
        success: true,
        paymentIntentId,
        message: '¡Pago completado exitosamente!'
      };

    } catch (error) {
      setLoading(false);
      console.error('❌ Error en payWithPaymentSheet:', error);

      Alert.alert(
        'Error en el pago',
        error.message || 'No se pudo completar el pago. Intenta de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message
      };
    }
  };

  return {
    payWithPaymentSheet,
    loading
  };
};