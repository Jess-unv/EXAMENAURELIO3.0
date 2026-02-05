// App.js (versión final recomendada)
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import { AuthProvider } from "./src/context/AuthContext";
import { CourseProvider } from "./src/context/CourseContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { EnrollmentProvider } from "./src/context/EnrollmentContext"; // ← Cambiado aquí
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!stripePublishableKey) {
    console.error("Falta EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY en .env");
  }

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_51SHfQCEJmmqziTyLShhDhG4ubMVUdUdPoZhxMw0J5kH1mmUSVs88Cp1xrcEFvnXe1JMHni9KJbJutu8IO9GSvzNJ00Ign5TdVx">
        <ThemeProvider>
          <AuthProvider>
            <CourseProvider>
              <EnrollmentProvider>
                {" "}
                {/* ← Cambiado aquí */}
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </EnrollmentProvider>
            </CourseProvider>
          </AuthProvider>
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
