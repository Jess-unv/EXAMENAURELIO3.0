import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useCourses } from "../context/CourseContext";
import { useTheme } from "../context/ThemeContext";

export default function AdminCoursesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { myCourses, refreshCourses, deleteCourse, publishCourse } = useCourses();
  const { colors, isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    await refreshCourses();
    setLoading(false);
  };

  const openPreview = (course) => {
    if (!course) return;
    
    try {
      navigation.navigate("AdminPreview", { 
        courseData: {
          ...course,
          title: course.title,
          video_url: course.video_url,
          thumbnail_url: course.thumbnail_url,
          description: course.description,
          level: course.level || "Principiante",
          season: course.season || 1,
          price: course.price || 0
        } 
      });
    } catch (error) {
      console.error("Error de navegación:", error);
      Alert.alert("Error", "No se pudo abrir la vista previa.");
    }
  };

  const openEdit = (courseId) => {
    navigation.navigate("EditCourse", { courseId });
  };

  const openDeleteModal = (course) => {
    setSelectedCourse(course);
    setDeleteConfirmText("");
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmText.trim() !== selectedCourse.title.trim()) {
      Alert.alert("Nombre inválido", "El nombre del curso no coincide.");
      return;
    }
    setLoading(true);
    try {
      await deleteCourse(selectedCourse.id);
      Alert.alert("Éxito", "Curso eliminado");
      await refreshCourses();
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar");
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
    }
  };

  const handlePublish = async (course) => {
    Alert.alert(
      "Publicar curso",
      `¿Quieres publicar "${course.title}" ahora?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Publicar",
          style: "default",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await publishCourse(course.id, true);
              if (result.success) {
                Alert.alert("Éxito", "Curso publicado correctamente");
                await refreshCourses();
              } else {
                Alert.alert("Error", result.error || "No se pudo publicar");
              }
            } catch (err) {
              Alert.alert("Error", "Ocurrió un problema al publicar");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderCourse = ({ item }) => {
    const isPublished = item.is_published === true;

    // Lógica de precio con descuento
    const originalPrice = Number(item.price) || 0;
    const discountedPrice = Number(item.discount_price) || null;
    const hasValidDiscount = discountedPrice !== null && discountedPrice > 0 && discountedPrice < originalPrice;
    const discountPercent = hasValidDiscount 
      ? Math.round((originalPrice - discountedPrice) / originalPrice * 100) 
      : 0;

    return (
      <View style={[styles.courseCard, { backgroundColor: colors.card }]}>
        {/* Badge de estado (Publicado / Borrador) */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: isPublished ? '#10B981' : '#EF4444' }
        ]}>
          <Text style={styles.statusText}>
            {isPublished ? 'Publicado' : 'Borrador'}
          </Text>
        </View>

        {/* Contenedor de imagen + título → todo clickable */}
        <TouchableOpacity 
          style={{ flex: 1 }}
          onPress={() => openPreview(item)}
          activeOpacity={0.9}
        >
          <View style={styles.thumbnailContainer}>
            {item.thumbnail_url ? (
              <Image
                source={{ uri: item.thumbnail_url }}
                style={styles.courseThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.noImage, { backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9" }]}>
                <Icon name="image-off" size={60} color={colors.textSecondary} />
              </View>
            )}
          </View>

          {/* Título */}
          <View style={styles.courseHeader}>
            <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            
            <View style={styles.courseActions}>
              <TouchableOpacity onPress={() => openEdit(item.id)}>
                <Icon name="pencil" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openDeleteModal(item)}>
                <Icon name="delete" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Precio con descuento */}
        <View style={styles.courseMeta}>
          <View style={styles.metaRow}>
            <Icon name="currency-usd" size={16} color={colors.primary} />
            {hasValidDiscount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.metaText, { color: colors.primary, fontWeight: 'bold' }]}>
                  ${discountedPrice.toFixed(2)}
                </Text>
                <Text style={[styles.metaText, { 
                  color: colors.textSecondary, 
                  textDecorationLine: 'line-through',
                  fontSize: 13 
                }]}>
                  ${originalPrice.toFixed(2)}
                </Text>
                <Text style={{ 
                  color: '#ef4444', 
                  fontSize: 12, 
                  fontWeight: '600' 
                }}>
                  -{discountPercent}%
                </Text>
              </View>
            ) : (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {originalPrice > 0 ? `$${originalPrice.toFixed(2)}` : "Gratis"}
              </Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Icon name="signal" size={16} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.level}
            </Text>
          </View>
        </View>

        {/* Botón Publicar - SOLO si está en borrador */}
        {!isPublished && (
          <TouchableOpacity 
            style={[styles.publishButton, { backgroundColor: colors.primary }]}
            onPress={() => handlePublish(item)}
          >
            <Icon name="rocket-launch" size={20} color="#fff" />
            <Text style={styles.publishButtonText}>Publicar ahora</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const publishedCount = myCourses.filter(c => c.is_published).length;
  const draftCount = myCourses.length - publishedCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.navbar, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ width: 28 }} /> 
        
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.navbarTitle, { color: colors.text }]}>Mis Cursos</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Publicados: {publishedCount} | Borradores: {draftCount}
          </Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("AddCourse")}>
          <Icon name="plus-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : myCourses.length === 0 ? (
        <View style={styles.centerEmpty}>
          <Icon name="book-multiple-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 20 }]}>
            Aún no tienes cursos
          </Text>
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: colors.primary }]} 
            onPress={() => navigation.navigate("AddCourse")}
          >
            <Icon name="plus" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Crear curso</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myCourses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        />
      )}

      {/* Modal Eliminar */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Eliminar curso</Text>
            <Text style={{color: colors.textSecondary, marginBottom: 10}}>
              Escribe: {selectedCourse?.title}
            </Text>
            <TextInput
              style={[styles.confirmInput, { backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9", color: colors.text, borderColor: colors.border }]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Confirmar nombre"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={[styles.cancelButtonText, {color: colors.text}]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteButton, { backgroundColor: "#ef4444" }]} onPress={confirmDelete}>
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1 
  },
  navbarTitle: { fontSize: 20, fontWeight: "bold" },
  list: { padding: 16 },
  courseCard: { 
    borderRadius: 16, 
    marginBottom: 20, 
    padding: 16, 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowRadius: 8,
    position: 'relative'
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14
  },
  thumbnailContainer: { 
    width: "100%", 
    height: 200, 
    borderRadius: 12, 
    overflow: "hidden", 
    marginBottom: 12 
  },
  courseThumbnail: { width: "100%", height: "100%" },
  noImage: { width: "100%", height: "100%", justifyContent: 'center', alignItems: 'center' },
  courseHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  courseTitle: { fontSize: 18, fontWeight: "700", marginRight: 10, flex: 1 },
  courseActions: { flexDirection: "row", gap: 15 },
  courseMeta: { 
    flexDirection: 'row', 
    gap: 20,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  metaRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6 
  },
  metaText: { fontSize: 14 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerEmpty: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 40 
  },
  emptyText: { fontSize: 18, textAlign: "center" },
  createButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 12, 
    marginTop: 24 
  },
  createButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 8 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  modalContent: { width: "90%", borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  confirmInput: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelButton: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: "center", 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ccc' 
  },
  cancelButtonText: { fontWeight: "600" },
  deleteButton: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 10 },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
});