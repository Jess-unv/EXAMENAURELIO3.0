import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, TextInput, Modal, Platform, 
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabase';
// IMPORTANTE: Importar TabActions
import { TabActions } from "@react-navigation/native";

export default function ProviderProfileScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || 'Mi Tienda S.A.');
  const [tempName, setTempName] = useState(name);
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [stats, setStats] = useState({
    productos: 0,
    ventas: 0,
    loading: true
  });
  
  const [modalConfig, setModalConfig] = useState({ 
    title: '', message: '', icon: 'info', confirmText: 'Aceptar', onConfirm: () => {} 
  });

  useEffect(() => {
    if (user?.name && user.name !== name) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadRealStats();
    }
  }, [user?.id]);

  const loadRealStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      const { data: productosData, error: productosError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('provider_id', user.id)
        .eq('is_active', true);

      if (productosError) {
        console.error('Error obteniendo productos:', productosError);
      }

      const { data: ventasData, error: ventasError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('provider_id', user.id)
        .eq('status', 'completed');

      if (ventasError) {
        console.log('No se pudieron obtener ventas, usando valor por defecto');
      }

      setStats({
        productos: productosData?.length || 0,
        ventas: ventasData?.length || 0,
        loading: false
      });

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setStats({
        productos: 0,
        ventas: 0,
        loading: false
      });
    }
  };

  const getInitial = () => {
    if (name) return name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "P";
  };

  const showCustomAlert = (title, message, icon, onConfirm, confirmText = 'Confirmar') => {
    setModalConfig({
      title, message, icon, confirmText,
      onConfirm: () => { setModalVisible(false); if (onConfirm) onConfirm(); },
    });
    setModalVisible(true);
  };

  const handleEditPress = () => {
    if (isEditing) {
      if (tempName.trim() === name) {
        setIsEditing(false);
        return;
      }
      showCustomAlert(
        "¿Actualizar nombre?",
        "¿Estás seguro que deseas actualizar el nombre de tu tienda?",
        "help",
        () => updateBusinessName(),
        "Actualizar"
      );
    } else {
      setTempName(name);
      setIsEditing(true);
    }
  };

  const updateBusinessName = async () => {
    if (!tempName.trim()) {
      Alert.alert("Error", "El nombre de la tienda no puede estar vacío");
      return;
    }

    setUpdating(true);
    try {
      const result = await updateProfile({ name: tempName.trim() });
      if (result.success) {
        setName(tempName.trim());
        setIsEditing(false);
        Alert.alert("✅ Éxito", "Nombre de tienda actualizado correctamente", [{ text: "OK" }]);
      } else {
        Alert.alert("❌ Error", result.error || "Error al actualizar el nombre");
        setTempName(name);
      }
    } catch (error) {
      console.error("Error actualizando nombre de tienda:", error);
      Alert.alert("❌ Error", "Ocurrió un error al actualizar el nombre");
      setTempName(name);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    showCustomAlert(
      "Cerrar sesión",
      "¿Estás seguro que deseas salir? Tendrás que ingresar tus credenciales nuevamente.",
      "logout",
      async () => await logout(),
      "Cerrar Sesión"
    );
  };

  const handleRefreshStats = async () => {
    await loadRealStats();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: modalConfig.icon === 'logout' ? (isDarkMode ? '#451a1a' : '#FEF2F2') : (isDarkMode ? '#1e3a8a' : '#EFF6FF') }]}>
              <Icon 
                name={modalConfig.icon} 
                size={40} 
                color={modalConfig.icon === 'logout' ? '#EF4444' : colors.primary} 
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalConfig.title}</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{modalConfig.message}</Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: isDarkMode ? '#333' : '#F3F4F6' }]} 
                onPress={() => {
                  setModalVisible(false);
                  if (isEditing) {
                    setTempName(name);
                    setIsEditing(false);
                  }
                }}
                disabled={updating}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalConfirmButton, 
                  { 
                    backgroundColor: modalConfig.icon === 'logout' ? '#DC2626' : colors.primary,
                    opacity: updating ? 0.7 : 1
                  }
                ]}
                onPress={modalConfig.onConfirm}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{modalConfig.confirmText}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header Fijo - SE ACTUALIZÓ LA NAVEGACIÓN AQUÍ */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.dispatch(TabActions.jumpTo("AdminHome"))} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil de Proveedor</Text>
        <TouchableOpacity 
          onPress={handleEditPress} 
          style={styles.editButton}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.editText}>{isEditing ? 'Guardar' : 'Editar'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={stats.loading}
            onRefresh={handleRefreshStats}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary, borderColor: isDarkMode ? '#444' : '#fff' }]}>
              <Text style={styles.avatarInitial}>{getInitial()}</Text>
            </View>
          </View>

          <View style={styles.userInfo}>
            {isEditing ? (
              <TextInput
                style={[styles.inputActive, { 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#F3F4F6', 
                    color: colors.text, 
                    borderBottomColor: colors.primary 
                }]}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Nombre de tu tienda"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                maxLength={100}
                editable={!updating}
              />
            ) : (
              <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
            )}
            <View style={styles.emailBadge}>
              <Icon name="email" size={14} color={colors.textSecondary} />
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || 'proveedor@quickpay.com'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? '#064e3b' : '#ECFDF5' }]}>
              <Text style={[styles.statusText, { color: '#10b981' }]}>CUENTA VERIFICADA</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información del Negocio</Text>
          <View style={styles.infoRow}>
            <Icon name="business" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tipo:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.role === 'provider' ? 'Proveedor' : user?.role || 'Proveedor'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="calendar-today" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Registrado desde:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : 'Fecha no disponible'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="update" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Última actualización:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.updated_at ? new Date(user.updated_at).toLocaleDateString('es-MX') : 'No actualizado'}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.statsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Estadísticas</Text>
            <TouchableOpacity onPress={handleRefreshStats} disabled={stats.loading}>
              <Icon name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {stats.loading ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando estadísticas...</Text>
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#1e3a8a' : '#EFF6FF' }]}>
                  <Icon name="inventory" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.productos}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Productos Activos</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#064e3b' : '#ECFDF5' }]}>
                  <Icon name="shopping-cart" size={28} color="#10b981" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.ventas}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ventas Completadas</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</Text>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              San Luis Río Colorado, Sonora, México.
            </Text>
          </View>
        </View>

        <View style={styles.logoutWrapper}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: isDarkMode ? '#451a1a' : '#FCA5A5' }]} 
            onPress={handleLogout}
            disabled={updating || stats.loading}
          >
            <Icon name="logout" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Cerrar sesión de la cuenta</Text>
          </TouchableOpacity>
          <Text style={[styles.footerNote, { color: colors.textSecondary }]}>QuickPay Business v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 20 },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalButtonsRow: { flexDirection: 'row', width: '100%', gap: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontWeight: '600', fontSize: 15 },
  modalConfirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 4 },
  editButton: { paddingVertical: 4, paddingHorizontal: 10, minWidth: 60, alignItems: 'center' },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  userCard: { padding: 24, margin: 16, borderRadius: 20, alignItems: 'center', elevation: 3 },
  avatarWrapper: { marginBottom: 16 },
  userAvatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 3,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1
  },
  userInfo: { alignItems: 'center', width: '100%' },
  userName: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  userEmail: { fontSize: 14, marginLeft: 6 },
  inputActive: { 
    width: '90%', 
    borderRadius: 8, 
    padding: 12, 
    textAlign: 'center', 
    fontSize: 18, 
    borderBottomWidth: 2,
    marginBottom: 8 
  },
  statusBadge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '800' },
  section: { marginHorizontal: 16, marginBottom: 12, padding: 18, borderRadius: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 16 },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  loadingStats: {
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: 8 
  },
  statItem: { 
    alignItems: 'center', 
    flex: 1,
    padding: 10
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginTop: 4 
  },
  statLabel: { 
    fontSize: 12, 
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600'
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, marginLeft: 8, width: 130 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { marginLeft: 10, fontSize: 14 },
  logoutWrapper: { marginTop: 24, paddingHorizontal: 16, alignItems: 'center' },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  logoutText: { marginLeft: 8, color: '#DC2626', fontWeight: 'bold', fontSize: 15 },
  footerNote: { marginTop: 12, fontSize: 11 },
});