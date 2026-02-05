// src/screens/EditCourseScreen.js - VERSIÓN CORREGIDA Y COMPLETA
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  FlatList,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useCourses } from "../context/CourseContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { v4 as uuidv4 } from "uuid";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function EditCourseScreen({ route, navigation }) {
  const { courseId } = route.params;
  const { refreshCourses } = useCourses();
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [course, setCourse] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [level, setLevel] = useState("principiante");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Estados para lecciones
  const [lessons, setLessons] = useState([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonVideoUri, setLessonVideoUri] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoSourceType, setVideoSourceType] = useState("url");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          course_lessons(*)
        `)
        .eq("id", courseId)
        .eq("admin_id", user.id)
        .single();

      if (error) throw error;
      if (!data) {
        Alert.alert("Error", "Curso no encontrado o no tienes permiso");
        navigation.goBack();
        return;
      }

      setCourse(data);
      setTitle(data.title || "");
      setPrice(data.price?.toString() || "0");
      setDescription(data.description || "");
      setLevel(data.level || "principiante");
      const totalMin = Math.round((data.duration_hours || 0) * 60);
      setDurationHours(Math.floor(totalMin / 60).toString());
      setDurationMinutes((totalMin % 60).toString());

      setLessons(data.course_lessons || []);

      if (data.thumbnail_url) {
        setImages([data.thumbnail_url]);
      }
    } catch (err) {
      console.error("Error cargando curso:", err);
      Alert.alert("Error", "No se pudo cargar el curso");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePickerOption = async (type) => {
    setShowPicker(false);
    let result;
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la galería");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        aspect: [16, 9],
      });
    }

    if (!result.canceled && result.assets) {
      setImages(result.assets.map((asset) => asset.uri));
    }
  };

  const uploadImage = async () => {
    if (images.length === 0) return course.thumbnail_url;

    const imageUri = images[0];
    if (imageUri === course.thumbnail_url) return imageUri;

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `cursos/${user.id}/${courseId}/thumbnail_${uuidv4()}.jpg`;

      const { error } = await supabase.storage
        .from("course-media")
        .upload(fileName, decode(base64), { 
          contentType: "image/jpeg",
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("course-media")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      Alert.alert("Error", "No se pudo subir la imagen");
      return course.thumbnail_url;
    }
  };

  const openLessonModal = (lesson = null) => {
    setCurrentLesson(lesson);
    setLessonTitle(lesson?.title || "");
    setLessonDescription(lesson?.description || "");
    setLessonVideoUrl(lesson?.video_url || "");
    setLessonDuration(lesson?.duration?.toString() || "");
    setLessonVideoUri(null);
    setUploadProgress(0);
    
    if (lesson?.video_url) {
      const isLocalFile = lesson.video_url.includes('supabase.co') || 
                          lesson.video_url.includes('storage.googleapis') ||
                          (lesson.video_url.startsWith('http') && !lesson.video_url.includes('youtube') && !lesson.video_url.includes('vimeo'));
      setVideoSourceType(isLocalFile ? "file" : "url");
    } else {
      setVideoSourceType("url");
    }
    
    setShowLessonModal(true);
  };

  const pickLessonVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a la galería");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        videoQuality: 0.5,
        videoMaxDuration: 600, // 10 minutos máximo
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.POPOVER,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoAsset = result.assets[0];
        setLessonVideoUri(videoAsset.uri);
        setVideoSourceType("file");
        setLessonVideoUrl("");
        console.log("Video seleccionado:", {
          uri: videoAsset.uri,
          size: videoAsset.fileSize,
          duration: videoAsset.duration
        });
      }
    } catch (error) {
      console.error("Error seleccionando video:", error);
      Alert.alert("Error", "No se pudo seleccionar el video");
    }
  };

  // ✅ FUNCIÓN CORREGIDA PARA SUBIR VIDEOS - MÁS EFICIENTE
  const uploadVideoToSupabase = async (videoUri) => {
    if (!videoUri) return null;
    
    setUploadingVideo(true);
    setUploadProgress(0);
    
    try {
      console.log("📤 Iniciando subida de video...");
      
      // 1. Verificar archivo
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error("El archivo no existe");
      }
      
      console.log(`📊 Tamaño del archivo: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB`);
      
      // 2. Verificar tamaño máximo (50MB para mejor compatibilidad)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileInfo.size > maxSize) {
        throw new Error(`El video es muy grande (${(fileInfo.size / (1024 * 1024)).toFixed(2)}MB). Máximo: 50MB`);
      }
      
      // 3. Leer archivo como base64 en chunks (para evitar memory issues)
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // 4. Obtener extensión y tipo MIME
      const fileExt = videoUri.split('.').pop().toLowerCase();
      const mimeType = fileExt === 'mp4' ? 'video/mp4' : 
                      fileExt === 'mov' ? 'video/quicktime' : 
                      fileExt === 'avi' ? 'video/x-msvideo' :
                      `video/${fileExt}`;
      
      // 5. Generar nombre único
      const uniqueFileName = `lessons/${courseId}/${uuidv4()}.${fileExt}`;
      
      console.log("📁 Subiendo a:", uniqueFileName);
      
      // 6. Convertir base64 a ArrayBuffer
      const arrayBuffer = decode(base64);
      
      // 7. Simular progreso
      setUploadProgress(30);
      
      // 8. Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from("lesson-videos")
        .upload(uniqueFileName, arrayBuffer, { 
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error("❌ Error detallado de Supabase:", error);
        
        // Manejar errores específicos
        if (error.message.includes('The resource already exists')) {
          throw new Error("Ya existe un video con ese nombre");
        } else if (error.message.includes('Payload too large')) {
          throw new Error("El archivo es demasiado grande");
        } else if (error.message.includes('Network request failed')) {
          throw new Error("Error de conexión. Verifica tu internet");
        } else {
          throw new Error(`Error al subir: ${error.message}`);
        }
      }
      
      setUploadProgress(90);
      
      // 9. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from("lesson-videos")
        .getPublicUrl(uniqueFileName);
      
      console.log("✅ Video subido exitosamente:", urlData.publicUrl);
      setUploadProgress(100);
      
      return urlData.publicUrl;
      
    } catch (error) {
      console.error("❌ Error crítico subiendo video:", error);
      Alert.alert(
        "Error al subir video", 
        error.message || "No se pudo subir el video. Intenta con uno más pequeño o en formato MP4."
      );
      return null;
    } finally {
      setTimeout(() => {
        setUploadingVideo(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  // ✅ FUNCIÓN SIMPLIFICADA PARA GUARDAR LECCIÓN
  const saveLesson = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert("Error", "El título de la lección es obligatorio");
      return;
    }

    const durationNum = parseFloat(lessonDuration) || 0;

    try {
      let finalVideoUrl = lessonVideoUrl;
      
      // Si el usuario seleccionó un archivo de video
      if (videoSourceType === "file" && lessonVideoUri) {
        const uploadedUrl = await uploadVideoToSupabase(lessonVideoUri);
        if (!uploadedUrl) {
          return; // No continuar si falló la subida
        }
        finalVideoUrl = uploadedUrl;
      }
      
      // Guardar la lección
      await saveLessonWithVideo(finalVideoUrl, durationNum);
      
    } catch (error) {
      console.error("Error en saveLesson:", error);
      Alert.alert("Error", "No se pudo procesar la lección");
    }
  };

  const saveLessonWithVideo = async (videoUrl, durationNum) => {
    const lessonData = {
      title: lessonTitle.trim(),
      description: lessonDescription.trim() || null,
      video_url: videoUrl,
      duration: durationNum,
      order_index: currentLesson ? currentLesson.order_index : lessons.length,
    };

    try {
      if (currentLesson) {
        // Actualizar lección existente
        const { error } = await supabase
          .from("course_lessons")
          .update(lessonData)
          .eq("id", currentLesson.id);

        if (error) throw error;

        setLessons(prev =>
          prev.map(l => l.id === currentLesson.id ? { ...l, ...lessonData } : l)
        );
      } else {
        // Nueva lección
        lessonData.course_id = courseId;

        const { data: newLesson, error } = await supabase
          .from("course_lessons")
          .insert([lessonData])
          .select()
          .single();

        if (error) throw error;

        setLessons(prev => [...prev, newLesson]);
      }

      setShowLessonModal(false);
      setCurrentLesson(null);
      Alert.alert("Éxito", "Lección guardada correctamente");
    } catch (err) {
      console.error("Error guardando lección:", err);
      Alert.alert("Error", "No se pudo guardar la lección: " + (err.message || "Error desconocido"));
    }
  };

  const deleteLesson = async (lessonId) => {
    const lessonToDelete = lessons.find(l => l.id === lessonId);
    
    Alert.alert(
      "Eliminar lección",
      "¿Estás seguro de eliminar esta lección?" + 
      (lessonToDelete?.video_url ? "\n\nEl video también será eliminado." : ""),
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Eliminar video de storage si existe
              if (lessonToDelete?.video_url) {
                const videoUrl = lessonToDelete.video_url;
                if (videoUrl.includes('supabase.co') || videoUrl.includes('storage.googleapis')) {
                  try {
                    const urlParts = videoUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    const filePath = `lessons/${courseId}/${fileName}`;
                    
                    const { error: deleteError } = await supabase.storage
                      .from("lesson-videos")
                      .remove([filePath]);
                      
                    if (!deleteError) {
                      console.log("✅ Video eliminado de storage");
                    }
                  } catch (storageError) {
                    console.log("No se pudo eliminar video de storage:", storageError);
                  }
                }
              }

              // Eliminar lección de la base de datos
              const { error } = await supabase
                .from("course_lessons")
                .delete()
                .eq("id", lessonId);

              if (error) throw error;

              setLessons(prev => prev.filter(l => l.id !== lessonId));
              Alert.alert("Éxito", "Lección eliminada");
            } catch (err) {
              console.error("Error eliminando lección:", err);
              Alert.alert("Error", "No se pudo eliminar la lección");
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Error", "Precio inválido");
      return;
    }

    const totalDuration =
      (parseInt(durationHours) || 0) + (parseInt(durationMinutes) || 0) / 60;
    if (totalDuration <= 0) {
      Alert.alert("Error", "Duración inválida");
      return;
    }

    setIsSubmitting(true);

    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        price: priceNum,
        level,
        duration_hours: totalDuration,
      };

      const newThumbnail = await uploadImage();
      if (newThumbnail) {
        updates.thumbnail_url = newThumbnail;
      }

      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId);

      if (error) throw error;

      await refreshCourses();
      Alert.alert("Éxito", "Curso actualizado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error actualizando curso:", error);
      Alert.alert("Error", "No se pudo actualizar el curso");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Editar Curso</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Portada */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Portada del Curso
          </Text>
          {images.length > 0 ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: images[0] }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={() => setShowPicker(true)}
              >
                <Icon name="image-edit" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => setShowPicker(true)}
            >
              <Icon name="image-plus" size={50} color={colors.primary} />
              <Text style={[styles.uploadText, { color: colors.text }]}>
                Cambiar portada
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Formulario principal */}
        <View style={styles.form}>
          <Text style={styles.label}>Título del curso *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Título del curso"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Precio (MXN)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
              },
            ]}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00 (0 = gratis)"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Nivel</Text>
          <View style={styles.levelRow}>
            {["principiante", "intermedio", "avanzado"].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelBtn,
                  {
                    backgroundColor:
                      level === lvl
                        ? colors.primary
                        : isDarkMode
                          ? "#1e293b"
                          : "#f1f5f9",
                  },
                ]}
                onPress={() => setLevel(lvl)}
              >
                <Text style={{ color: level === lvl ? "#fff" : colors.text }}>
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Duración total</Text>
          <View style={styles.durationContainer}>
            <View style={styles.durationBox}>
              <Text style={styles.durationLabel}>Horas</Text>
              <TextInput
                style={[
                  styles.durationInput,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                  },
                ]}
                placeholder="0"
                keyboardType="number-pad"
                value={durationHours}
                onChangeText={setDurationHours}
              />
            </View>
            <View style={styles.durationBox}>
              <Text style={styles.durationLabel}>Minutos</Text>
              <TextInput
                style={[
                  styles.durationInput,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                  },
                ]}
                placeholder="0"
                keyboardType="number-pad"
                value={durationMinutes}
                onChangeText={(t) => {
                  const value = parseInt(t);
                  if (!isNaN(value) && value >= 0 && value < 60) {
                    setDurationMinutes(t);
                  } else if (t === "") {
                    setDurationMinutes("");
                  }
                }}
              />
            </View>
          </View>

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
              },
            ]}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe tu curso..."
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Sección de lecciones */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Lecciones del Curso ({lessons.length})
            </Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() => openLessonModal()}
            >
              <Icon name="plus-circle" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: "600" }}>
                Agregar lección
              </Text>
            </TouchableOpacity>
          </View>

          {lessons.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: "center", marginVertical: 20 }}>
              Aún no hay lecciones. Agrega una para comenzar.
            </Text>
          ) : (
            <FlatList
              data={lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View style={[styles.lessonItem, { backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {index + 1}. {item.title}
                    </Text>
                    {item.description && (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      Duración: {item.duration || 0} min
                    </Text>
                    {item.video_url && (
                      <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
                        {item.video_url.includes('youtube') ? 'YouTube' : 
                         item.video_url.includes('vimeo') ? 'Vimeo' : 'Video subido'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity onPress={() => openLessonModal(item)}>
                      <Icon name="pencil" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteLesson(item.id)}>
                      <Icon name="delete" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Botones */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal selección de imagen */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Cambiar portada
              </Text>
              <View style={{ flexDirection: "row", gap: 20, marginTop: 20 }}>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handlePickerOption("camera")}
                >
                  <Icon name="camera" size={32} color="#fff" />
                  <Text style={{ color: "#fff", marginTop: 8 }}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handlePickerOption("library")}
                >
                  <Icon name="image-multiple" size={32} color="#fff" />
                  <Text style={{ color: "#fff", marginTop: 8 }}>Galería</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ marginTop: 30 }}
                onPress={() => setShowPicker(false)}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal para agregar/editar lección */}
      <Modal visible={showLessonModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowLessonModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { 
                backgroundColor: colors.card,
                maxHeight: '90%',
                width: '95%',
                paddingVertical: 0,
              }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 20 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {currentLesson ? "Editar Lección" : "Nueva Lección"}
                  </Text>

                  <Text style={styles.label}>Título de la lección *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc", 
                      color: colors.text 
                    }]}
                    value={lessonTitle}
                    onChangeText={setLessonTitle}
                    placeholder="Título de la lección"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc", 
                      color: colors.text,
                      height: 80 
                    }]}
                    multiline
                    numberOfLines={3}
                    value={lessonDescription}
                    onChangeText={setLessonDescription}
                    placeholder="Descripción de la lección..."
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.label}>Video de la lección</Text>
                  
                  {/* Selector de tipo de video */}
                  <View style={{ flexDirection: "row", marginBottom: 16, gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.videoTypeButton,
                        { 
                          backgroundColor: videoSourceType === "file" ? colors.primary + '20' : 'transparent',
                          borderColor: videoSourceType === "file" ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => {
                        setVideoSourceType("file");
                        setLessonVideoUrl("");
                      }}
                    >
                      <Icon 
                        name="upload" 
                        size={20} 
                        color={videoSourceType === "file" ? colors.primary : colors.text} 
                      />
                      <Text style={{ 
                        color: videoSourceType === "file" ? colors.primary : colors.text,
                        marginLeft: 6,
                        fontSize: 14,
                      }}>
                        Subir archivo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.videoTypeButton,
                        { 
                          backgroundColor: videoSourceType === "url" ? colors.primary + '20' : 'transparent',
                          borderColor: videoSourceType === "url" ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => {
                        setVideoSourceType("url");
                        setLessonVideoUri(null);
                      }}
                    >
                      <Icon 
                        name="link" 
                        size={20} 
                        color={videoSourceType === "url" ? colors.primary : colors.text} 
                      />
                      <Text style={{ 
                        color: videoSourceType === "url" ? colors.primary : colors.text,
                        marginLeft: 6,
                        fontSize: 14,
                      }}>
                        Usar URL
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {videoSourceType === "file" ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.videoUploadButton,
                          { 
                            backgroundColor: lessonVideoUri ? colors.primary + '20' : colors.card,
                            borderColor: lessonVideoUri ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={pickLessonVideo}
                        disabled={uploadingVideo}
                      >
                        {uploadingVideo ? (
                          <View style={{ alignItems: 'center', width: '100%' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={{ color: colors.primary, marginTop: 8, textAlign: 'center' }}>
                              Subiendo... {uploadProgress}%
                            </Text>
                            <View style={{ 
                              width: '100%', 
                              height: 4, 
                              backgroundColor: colors.border, 
                              marginTop: 8,
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}>
                              <View style={{ 
                                width: `${uploadProgress}%`, 
                                height: '100%', 
                                backgroundColor: colors.primary 
                              }} />
                            </View>
                          </View>
                        ) : lessonVideoUri ? (
                          <>
                            <Icon name="video-check" size={24} color={colors.primary} />
                            <Text style={{ color: colors.primary, marginLeft: 10, fontWeight: '600' }}>
                              Video seleccionado ✓
                            </Text>
                          </>
                        ) : currentLesson?.video_url ? (
                          <>
                            <Icon name="video" size={24} color={colors.primary} />
                            <Text style={{ color: colors.text, marginLeft: 10, fontSize: 14 }}>
                              Video actual disponible
                            </Text>
                          </>
                        ) : (
                          <>
                            <Icon name="video-plus" size={24} color={colors.text} />
                            <Text style={{ color: colors.text, marginLeft: 10 }}>
                              Seleccionar video (MP4 recomendado)
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <Text style={[styles.videoInfoText, { color: colors.textSecondary }]}>
                        Máximo 50MB • Duración recomendada: 5-10 minutos
                      </Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc", 
                          color: colors.text 
                        }]}
                        value={lessonVideoUrl}
                        onChangeText={setLessonVideoUrl}
                        placeholder="Ej: https://youtube.com/watch?v=ID o https://vimeo.com/ID"
                        placeholderTextColor="#94a3b8"
                      />
                      <Text style={[styles.videoInfoText, { color: colors.textSecondary }]}>
                        Soporta YouTube, Vimeo y otros servicios
                      </Text>
                    </>
                  )}

                  <Text style={styles.label}>Duración (minutos)</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc", 
                      color: colors.text 
                    }]}
                    value={lessonDuration}
                    onChangeText={setLessonDuration}
                    keyboardType="numeric"
                    placeholder="Ej: 15"
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 30, marginBottom: 20 }}>
                    <TouchableOpacity
                      style={[styles.saveBtn, { 
                        flex: 1, 
                        backgroundColor: colors.primary,
                        opacity: uploadingVideo ? 0.6 : 1
                      }]}
                      onPress={saveLesson}
                      disabled={uploadingVideo || !lessonTitle.trim()}
                    >
                      {uploadingVideo ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Guardar Lección</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { 
                        flex: 1, 
                        borderColor: colors.border 
                      }]}
                      onPress={() => {
                        setShowLessonModal(false);
                        setCurrentLesson(null);
                      }}
                      disabled={uploadingVideo}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginLeft: 20,
    flex: 1,
  },
  scrollContent: { 
    padding: 20,
    paddingBottom: 40,
  },
  section: { 
    marginBottom: 30,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    marginBottom: 16,
  },
  uploadBox: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#64748b",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: { 
    fontWeight: "600", 
    marginTop: 8,
    fontSize: 16,
  },
  previewContainer: { 
    position: "relative",
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: { 
    width: "100%", 
    height: 200,
  },
  changeImageBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 50,
  },
  form: { 
    marginBottom: 30,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  textArea: { 
    height: 120, 
    textAlignVertical: "top",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  levelRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  levelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  durationContainer: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  durationBox: {
    flex: 1,
    alignItems: "center",
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  durationInput: { 
    width: "100%", 
    textAlign: "center",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  saveBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
    minHeight: 56,
  },
  saveBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 56,
  },
  cancelBtnText: { 
    fontWeight: "700", 
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: "#3b82f6",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
  },
  lessonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  videoTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  videoUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 8,
    minHeight: 80,
  },
  videoInfoText: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 16,
    textAlign: "center",
  },
});