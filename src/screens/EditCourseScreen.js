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
} from "react-native";
import { useCourses } from "../context/CourseContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";
import { v4 as uuidv4 } from "uuid";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

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
        .select(
          `
          *,
          course_lessons(*)
        `,
        )
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

  const openLessonModal = (lesson = null) => {
    setCurrentLesson(lesson);
    setLessonTitle(lesson?.title || "");
    setLessonDescription(lesson?.description || "");
    setLessonVideoUrl(lesson?.video_url || "");
    setLessonDuration(lesson?.duration?.toString() || "");
    setLessonVideoUri(null);
    setUploadProgress(0);

    if (lesson?.video_url) {
      const isLocalFile =
        lesson.video_url.includes("supabase.co") ||
        lesson.video_url.includes("storage.googleapis") ||
        (lesson.video_url.startsWith("http") &&
          !lesson.video_url.includes("youtube") &&
          !lesson.video_url.includes("vimeo"));
      setVideoSourceType(isLocalFile ? "file" : "url");
    } else {
      setVideoSourceType("url");
    }

    setShowLessonModal(true);
  };

  const pickLessonVideo = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la galeria");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoAsset = result.assets[0];
        setLessonVideoUri(videoAsset.uri);
        setVideoSourceType("file");
        setLessonVideoUrl("");
      }
    } catch (error) {
      console.error("Error seleccionando video:", error);
      Alert.alert("Error", "No se pudo seleccionar el video");
    }
  };

  const uploadVideoToSupabase = async (videoUri) => {
    if (!videoUri) return null;

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const base64Data = await FileSystem.readAsStringAsync(videoUri, {
        encoding: "base64",
      });

      const fileExt = videoUri.split(".").pop().toLowerCase();
      const uniqueFileName = `lessons/${courseId}/${uuidv4()}.${fileExt}`;

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error } = await supabase.storage
        .from("lesson-videos")
        .upload(uniqueFileName, bytes, {
          contentType: fileExt === "mp4" ? "video/mp4" : "video/*",
          cacheControl: "3600",
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lesson-videos")
        .getPublicUrl(uniqueFileName);

      setUploadProgress(100);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo video:", error);
      Alert.alert(
        "Error",
        "No se pudo subir el video: " + (error.message || "Intenta de nuevo"),
      );
      return null;
    } finally {
      setUploadingVideo(false);
    }
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert("Error", "El titulo de la leccion es obligatorio");
      return;
    }

    const durationNum = parseFloat(lessonDuration) || 0;

    try {
      let finalVideoUrl = lessonVideoUrl;

      if (videoSourceType === "file" && lessonVideoUri) {
        const uploadedUrl = await uploadVideoToSupabase(lessonVideoUri);
        if (!uploadedUrl) return;
        finalVideoUrl = uploadedUrl;
      } else if (videoSourceType === "file" && currentLesson?.video_url) {
        finalVideoUrl = currentLesson.video_url;
      }

      await saveLessonWithVideo(finalVideoUrl, durationNum);
    } catch (error) {
      console.error("Error en saveLesson:", error);
      Alert.alert("Error", "No se pudo guardar la leccion");
    }
  };

  const saveLessonWithVideo = async (videoUrl, durationNum) => {
    const lessonData = {
      title: lessonTitle.trim(),
      description: lessonDescription.trim() || null,
      video_url: videoUrl || null,
      duration: durationNum,
      order_index: currentLesson ? currentLesson.order_index : lessons.length,
    };

    try {
      if (currentLesson) {
        const { error } = await supabase
          .from("course_lessons")
          .update(lessonData)
          .eq("id", currentLesson.id);

        if (error) throw error;

        setLessons((prev) =>
          prev.map((l) =>
            l.id === currentLesson.id ? { ...l, ...lessonData } : l,
          ),
        );
      } else {
        lessonData.course_id = courseId;

        const { data: newLesson, error } = await supabase
          .from("course_lessons")
          .insert([lessonData])
          .select()
          .single();

        if (error) throw error;

        setLessons((prev) => [...prev, newLesson]);
      }

      setShowLessonModal(false);
      setCurrentLesson(null);
      Alert.alert("Exito", "Leccion guardada correctamente");
    } catch (err) {
      console.error("Error guardando leccion:", err);
      Alert.alert("Error", "No se pudo guardar la leccion: " + err.message);
    }
  };

  const deleteLesson = async (lessonId) => {
    const lessonToDelete = lessons.find((l) => l.id === lessonId);

    Alert.alert(
      "Eliminar leccion",
      "¿Estas seguro de eliminar esta leccion?" +
        (lessonToDelete?.video_url
          ? "\n\nEl video tambien sera eliminado."
          : ""),
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              if (lessonToDelete?.video_url) {
                const videoUrl = lessonToDelete.video_url;
                if (
                  videoUrl.includes("supabase.co") ||
                  videoUrl.includes("storage.googleapis")
                ) {
                  try {
                    const urlParts = videoUrl.split("/");
                    const fileName = urlParts[urlParts.length - 1];
                    const filePath = `lessons/${courseId}/${fileName}`;

                    const { error: deleteError } = await supabase.storage
                      .from("lesson-videos")
                      .remove([filePath]);

                    if (!deleteError) {
                      console.log("Video eliminado de storage");
                    }
                  } catch (storageError) {
                    console.log(
                      "No se pudo eliminar video de storage:",
                      storageError,
                    );
                  }
                }
              }

              const { error } = await supabase
                .from("course_lessons")
                .delete()
                .eq("id", lessonId);

              if (error) throw error;

              setLessons((prev) => prev.filter((l) => l.id !== lessonId));
              Alert.alert("Exito", "Leccion eliminada");
            } catch (err) {
              console.error("Error eliminando leccion:", err);
              Alert.alert("Error", "No se pudo eliminar la leccion");
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "El titulo es obligatorio");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Error", "Precio invalido");
      return;
    }

    const totalDuration =
      (parseInt(durationHours) || 0) + (parseInt(durationMinutes) || 0) / 60;
    if (totalDuration <= 0) {
      Alert.alert("Error", "Duracion invalida");
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

      if (images.length > 0 && images[0] !== course.thumbnail_url) {
        try {
          console.log("Intentando subir imagen...");
          const newThumbnail = await uploadImage();

          if (
            newThumbnail === course.thumbnail_url &&
            images[0] !== course.thumbnail_url
          ) {
            console.log(
              "Primer metodo fallo, intentando metodo alternativo...",
            );
            const fallbackThumbnail = await uploadImageFallback();
            if (
              fallbackThumbnail &&
              fallbackThumbnail !== course.thumbnail_url
            ) {
              updates.thumbnail_url = fallbackThumbnail;
            }
          } else if (newThumbnail && newThumbnail !== course.thumbnail_url) {
            updates.thumbnail_url = newThumbnail;
          }
        } catch (imageError) {
          console.log(
            "Todos los metodos de upload fallaron, continuando sin cambiar imagen...",
          );
        }
      }

      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId);

      if (error) throw error;

      await refreshCourses();

      let message = "Curso actualizado correctamente";
      if (updates.thumbnail_url) {
        message += " con nueva imagen";
      } else if (images.length > 0 && images[0] !== course.thumbnail_url) {
        message += " (la imagen no se pudo actualizar)";
      }

      Alert.alert("Exito", message);
      navigation.goBack();
    } catch (error) {
      console.error("Error actualizando curso:", error);
      Alert.alert("Error", "No se pudo actualizar el curso: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Cargando curso...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {images.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Portada del Curso
            </Text>
            <View style={styles.previewContainer}>
              <Image source={{ uri: images[0] }} style={styles.previewImage} />
            </View>
          </View>
        )}

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>
            Titulo del curso *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Titulo del curso"
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { color: colors.text }]}>
            Precio (MXN)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00 (0 = gratis)"
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { color: colors.text }]}>Nivel</Text>
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
                    borderColor: colors.border,
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

          <Text style={[styles.label, { color: colors.text }]}>
            Duracion total
          </Text>
          <View
            style={[styles.durationContainer, { borderColor: colors.border }]}
          >
            <View style={styles.durationBox}>
              <Text style={[styles.durationLabel, { color: colors.text }]}>
                Horas
              </Text>
              <TextInput
                style={[
                  styles.durationInput,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0"
                keyboardType="number-pad"
                value={durationHours}
                onChangeText={setDurationHours}
              />
            </View>
            <View style={styles.durationBox}>
              <Text style={[styles.durationLabel, { color: colors.text }]}>
                Minutos
              </Text>
              <TextInput
                style={[
                  styles.durationInput,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                    borderColor: colors.border,
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

          <Text style={[styles.label, { color: colors.text }]}>
            Descripcion
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                color: colors.text,
                borderColor: colors.border,
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Lecciones del Curso ({lessons.length})
            </Text>
            <TouchableOpacity
              style={styles.addLessonButton}
              onPress={() => openLessonModal()}
            >
              <Text style={[styles.addLessonText, { color: colors.primary }]}>
                Agregar leccion
              </Text>
            </TouchableOpacity>
          </View>

          {lessons.length === 0 ? (
            <View style={styles.emptyLessonsContainer}>
              <Text
                style={[
                  styles.emptyLessonsText,
                  { color: colors.textSecondary },
                ]}
              >
                Aun no hay lecciones. Agrega una para comenzar.
              </Text>
            </View>
          ) : (
            <FlatList
              data={lessons.sort(
                (a, b) => (a.order_index || 0) - (b.order_index || 0),
              )}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.lessonItem,
                    {
                      backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.lessonInfo}>
                    <Text style={[styles.lessonTitle, { color: colors.text }]}>
                      {index + 1}. {item.title}
                    </Text>
                    {item.description && (
                      <Text
                        style={[
                          styles.lessonDescription,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.lessonMeta}>
                      <Text
                        style={[
                          styles.lessonMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Duracion: {item.duration || 0} min
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      onPress={() => openLessonModal(item)}
                      style={styles.lessonActionButton}
                    >
                      <Text style={{ color: colors.primary }}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteLesson(item.id)}
                      style={styles.lessonActionButton}
                    >
                      <Text style={{ color: "#ef4444" }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>

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
            disabled={isSubmitting}
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showLessonModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                maxHeight: "80%",
                width: "90%",
              },
            ]}
          >
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {currentLesson ? "Editar Leccion" : "Nueva Leccion"}
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>
                Titulo *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={lessonTitle}
                onChangeText={setLessonTitle}
                placeholder="Titulo de la leccion"
              />

              <Text style={[styles.label, { color: colors.text }]}>
                Descripcion
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                    borderColor: colors.border,
                    height: 80,
                  },
                ]}
                multiline
                value={lessonDescription}
                onChangeText={setLessonDescription}
                placeholder="Descripcion de la leccion..."
              />

              <Text style={[styles.label, { color: colors.text }]}>
                Tipo de Video
              </Text>
              <View style={styles.videoTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.videoTypeButton,
                    {
                      backgroundColor:
                        videoSourceType === "url"
                          ? colors.primary
                          : isDarkMode
                            ? "#1e293b"
                            : "#f1f5f9",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setVideoSourceType("url")}
                >
                  <Text
                    style={{
                      color: videoSourceType === "url" ? "#fff" : colors.text,
                    }}
                  >
                    URL (YouTube, Vimeo)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.videoTypeButton,
                    {
                      backgroundColor:
                        videoSourceType === "file"
                          ? colors.primary
                          : isDarkMode
                            ? "#1e293b"
                            : "#f1f5f9",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setVideoSourceType("file");
                    if (
                      !lessonVideoUri &&
                      !lessonVideoUrl?.includes("supabase.co")
                    ) {
                      pickLessonVideo();
                    }
                  }}
                >
                  <Text
                    style={{
                      color: videoSourceType === "file" ? "#fff" : colors.text,
                    }}
                  >
                    Subir Archivo
                  </Text>
                </TouchableOpacity>
              </View>

              {videoSourceType === "url" ? (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>
                    URL del Video
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={lessonVideoUrl}
                    onChangeText={setLessonVideoUrl}
                    placeholder="https://youtube.com/..."
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Video Local
                  </Text>
                  {lessonVideoUri ||
                  currentLesson?.video_url?.includes("supabase.co") ? (
                    <View style={styles.videoSelectedContainer}>
                      <Text
                        style={[
                          styles.videoSelectedText,
                          { color: colors.text },
                        ]}
                      >
                        {lessonVideoUri
                          ? "Video seleccionado"
                          : "Video ya subido"}
                      </Text>
                      <TouchableOpacity
                        style={styles.changeVideoButton}
                        onPress={pickLessonVideo}
                      >
                        <Text style={{ color: colors.primary }}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadBox,
                        { borderColor: colors.primary, height: 60 },
                      ]}
                      onPress={pickLessonVideo}
                    >
                      <Text
                        style={[
                          styles.uploadText,
                          { color: colors.text, fontSize: 14 },
                        ]}
                      >
                        Seleccionar video
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <Text style={[styles.label, { color: colors.text }]}>
                Duracion (min)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={lessonDuration}
                onChangeText={setLessonDuration}
                keyboardType="numeric"
                placeholder="Ej: 15"
              />

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={saveLesson}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar Leccion</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowLessonModal(false)}
                  disabled={uploadingVideo}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  uploadBox: {
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  uploadText: {
    fontWeight: "600",
    marginTop: 10,
    fontSize: 16,
  },
  previewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  changeImageBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  changeImageText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 5,
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  levelRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  levelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  durationContainer: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    backgroundColor: "#f8fafc",
  },
  durationBox: {
    flex: 1,
    alignItems: "center",
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  durationInput: {
    width: "100%",
    textAlign: "center",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  addLessonButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  addLessonText: {
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyLessonsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
  },
  emptyLessonsText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
  lessonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  lessonInfo: {
    flex: 1,
    marginRight: 12,
  },
  lessonTitle: {
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 4,
  },
  lessonDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  lessonMetaText: {
    fontSize: 12,
  },
  lessonActions: {
    flexDirection: "row",
    gap: 10,
  },
  lessonActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    marginTop: 8,
    fontWeight: "600",
  },
  modalCancel: {
    marginTop: 20,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  videoTypeContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  videoTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  videoSelectedContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  videoSelectedText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  changeVideoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
});
