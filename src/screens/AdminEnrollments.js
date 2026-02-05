import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
// IMPORTANTE: Importar TabActions y Icon si quieres un botón interno
import { TabActions } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function AdminEnrollments({ navigation }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Botón de retroceso manual opcional por si el header fallara */}
      <TouchableOpacity 
        onPress={() => navigation.dispatch(TabActions.jumpTo("AdminHome"))}
        style={{ marginBottom: 20 }}
      >
        <Icon name="arrow-left" size={30} color={colors.primary} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>
        Panel de Inscripciones (Admin)
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Aquí aparecerán todos los alumnos inscritos en tus cursos.
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
        (Pantalla en desarrollo - pronto mostrará la lista real)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});