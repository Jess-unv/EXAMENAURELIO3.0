import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const ACCENT_COLOR = "#6366f1";

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "Cliente");
  const [tempName, setTempName] = useState(name);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
      setTempName(user.name);
    }
  }, [user]);

  const handleEditAction = async () => {
    if (isEditing) {
      if (tempName.trim() === "" || tempName.trim() === name) {
        setIsEditing(false);
        setTempName(name);
        return;
      }

      setUpdating(true);
      const result = await updateProfile({ name: tempName.trim() });
      if (result.success) {
        setName(tempName.trim());
        setIsEditing(false);
      }
      setUpdating(false);
    } else {
      setIsEditing(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        transparent
        backgroundColor="transparent"
      />

      {/* BOTÓN EDITAR EN LA ESQUINA SUPERIOR DERECHA */}
      <TouchableOpacity
        onPress={handleEditAction}
        disabled={updating}
        style={[
          styles.floatingEdit,
          {
            backgroundColor: isEditing ? "#10B981" : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {updating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon
            name={isEditing ? "check" : "pencil-outline"}
            size={22}
            color={isEditing ? "#fff" : ACCENT_COLOR}
          />
        )}
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroSection}>
          <View style={styles.avatarGlow}>
            <View
              style={[styles.avatarCircle, { backgroundColor: ACCENT_COLOR }]}
            >
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : "C"}
              </Text>
            </View>
          </View>

          {isEditing ? (
            <TextInput
              style={[
                styles.inputEdit,
                { color: colors.text, borderBottomColor: ACCENT_COLOR },
              ]}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={25}
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={[styles.userName, { color: colors.text }]}>
              {name}
            </Text>
          )}

          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>

          <View
            style={[styles.badge, { backgroundColor: ACCENT_COLOR + "15" }]}
          >
            <Text style={[styles.badgeText, { color: ACCENT_COLOR }]}>
              CUENTA ACTIVA
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              DATOS DE REGISTRO
            </Text>
            <View style={styles.row}>
              <Icon name="identifier" size={22} color={ACCENT_COLOR} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                ID: {user?.id?.slice(0, 12).toUpperCase() || "N/A"}
              </Text>
            </View>
            <View style={styles.row}>
              <Icon name="calendar-check" size={22} color={ACCENT_COLOR} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Miembro desde:{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              UBICACIÓN
            </Text>
            <View style={styles.row}>
              <Icon name="map-marker-outline" size={22} color={ACCENT_COLOR} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                San Luis Río Colorado, Sonora.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="logout-variant" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE CONFIRMACIÓN */}
      <Modal animationType="fade" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Icon name="alert-circle-outline" size={50} color="#EF4444" />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿SALIR AHORA?
            </Text>
            <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>
              Deberás ingresar tus credenciales la próxima vez que quieras
              acceder.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.btnCancel, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textSecondary, fontWeight: "700" }}
                >
                  CANCELAR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirm, { backgroundColor: "#EF4444" }]}
                onPress={logout}
              >
                <Text
                  style={styles.btnConfirmText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  CERRAR SESIÓN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 40, paddingBottom: 40 },
  floatingEdit: {
    position: "absolute",
    top: 45,
    right: 20,
    zIndex: 10,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  heroSection: { alignItems: "center", marginBottom: 25 },
  avatarGlow: {
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 50, fontWeight: "900", color: "#fff" },
  userName: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 4,
  },
  inputEdit: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 4,
    borderBottomWidth: 2,
    textAlign: "center",
    width: "70%",
    paddingBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    opacity: 0.5,
    marginBottom: 15,
    fontWeight: "500",
  },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  content: { paddingHorizontal: 25, gap: 15 },
  card: { padding: 22, borderRadius: 28, borderWidth: 1 },
  cardTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 20,
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },
  rowText: { fontSize: 15, fontWeight: "600" },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 25,
    marginTop: 5,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 30,
  },
  modalBox: { borderRadius: 35, padding: 30, alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "900", marginTop: 15 },
  modalMsg: {
    textAlign: "center",
    marginVertical: 15,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnConfirmText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
