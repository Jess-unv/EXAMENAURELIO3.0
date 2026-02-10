// src/screens/CourseViewScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Platform,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";
import Video from "react-native-video"; // Para reproducir videos

const { width } = Dimensions.get("window");

export default function CourseViewScreen({ route, navigation }) {
  const { courseId } = route.params || {};
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!courseId || !user?.id) return;
    loadCourseAndEnrollment();
  }, [courseId, user?.id]);

  const loadCourseAndEnrollment = async () => {
    try {
      setLoading(true);

      // 1. Cargar el curso
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error("Curso no encontrado");

      setCourse(courseData);

      // 2. Cargar inscripción del usuario
      const { data: enrollData, error: enrollError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("client_id", user.id)
        .eq("course_id", courseId)
        .single();

      if (enrollError && enrollError.code !== "PGRST116") throw enrollError; // Ignorar si no existe

      if (enrollData) {
        setEnrollment(enrollData);
        setProgress(enrollData.progress || 0);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error("Error cargando curso:", err);
      Alert.alert("Error", "No pudimos cargar el curso");
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async (lessonIndex) => {
    if (!enrollment || lessonIndex === -1) return;

    try {
      const newCompleted = [...completedLessons, lessonIndex];
      const totalLessons = course.course_lessons?.length || 1; // ← Usa course_lessons (tu schema real)
      const newProgress = Math.min(
        100,
        Math.round((newCompleted.length / totalLessons) * 100),
      );

      const { error } = await supabase
        .from("enrollments")
        .update({
          progress: newProgress,
          last_access_at: new Date().toISOString(),
          completed_at: newProgress === 100 ? new Date().toISOString() : null,
        })
        .eq("id", enrollment.id);

      if (error) throw error;

      setCompletedLessons(newCompleted);
      setProgress(newProgress);

      if (newProgress === 100) {
        Alert.alert("¡Felicidades!", "Has completado el curso");
      }
    } catch (err) {
      console.error("Error marcando lección:", err);
      Alert.alert("Error", "No se pudo actualizar el progreso");
    }
  };

  const isLessonCompleted = (index) => completedLessons.includes(index);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text
          style={{ color: colors.text, textAlign: "center", marginTop: 50 }}
        >
          Curso no encontrado o no estás inscrito
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header del curso */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.courseTitle, { color: colors.text }]}>
            {course.title}
          </Text>
        </View>

        {/* Barra de progreso */}
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={styles.progressHeader}>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              Progreso del curso
            </Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {progress}%
            </Text>
          </View>
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: colors.border },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completedLessons.length} de {course.course_lessons?.length || 0}{" "}
            lecciones completadas
          </Text>
        </View>

        {/* Lista de lecciones */}
        <View style={[styles.lessonsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Lecciones
          </Text>

          {course.course_lessons?.length > 0 ? (
            course.course_lessons.map((lesson, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.lessonItem,
                  isLessonCompleted(index) && styles.completedLesson,
                ]}
                onPress={() => setSelectedLesson(lesson)}
                disabled={isLessonCompleted(index)}
              >
                <View style={styles.lessonLeft}>
                  <View
                    style={[
                      styles.lessonNumber,
                      isLessonCompleted(index) && {
                        backgroundColor: "#10b981",
                      },
                    ]}
                  >
                    {isLessonCompleted(index) ? (
                      <Icon name="check" size={16} color="#fff" />
                    ) : (
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text
                      style={[
                        styles.lessonTitle,
                        {
                          color: isLessonCompleted(index)
                            ? "#10b981"
                            : colors.text,
                        },
                      ]}
                    >
                      {lesson.title}
                    </Text>
                    {lesson.duration && (
                      <Text
                        style={[
                          styles.lessonMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {lesson.duration} min
                      </Text>
                    )}
                  </View>
                </View>

                <Icon
                  name={
                    isLessonCompleted(index) ? "check-circle" : "play-circle"
                  }
                  size={28}
                  color={isLessonCompleted(index) ? "#10b981" : colors.primary}
                />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noContent, { color: colors.textSecondary }]}>
              Este curso aún no tiene lecciones cargadas
            </Text>
          )}
        </View>

        {/* Botón de certificado (placeholder) */}
        {progress === 100 && (
          <TouchableOpacity
            style={[styles.certificateButton, { backgroundColor: "#8b5cf6" }]}
            onPress={() =>
              Alert.alert(
                "Certificado",
                "¡Felicidades! Tu certificado está listo (implementar descarga)",
              )
            }
          >
            <Icon name="certificate" size={24} color="#fff" />
            <Text style={styles.certificateText}>Obtener Certificado</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de video/lección */}
      <Modal
        visible={!!selectedLesson}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedLesson(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedLesson?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedLesson(null)}>
                <Icon name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Reproductor de video */}
            {selectedLesson?.video_url ? (
              selectedLesson.video_url.includes("youtube.com") ||
              selectedLesson.video_url.includes("youtu.be") ? (
                <Text
                  style={{
                    color: colors.text,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Video de YouTube: {selectedLesson.video_url}
                  {"\n\n"}
                  (Implementa WebView o react-native-youtube-iframe aquí)
                </Text>
              ) : (
                <Video
                  source={{ uri: selectedLesson.video_url }}
                  style={styles.videoPlayer}
                  controls={true}
                  resizeMode="contain"
                  onEnd={() => {
                    const lessons = course.course_lessons || [];
                    const index = lessons.findIndex(
                      (l) => l.id === selectedLesson.id,
                    );
                    if (index !== -1 && !isLessonCompleted(index)) {
                      markLessonComplete(index);
                    }
                  }}
                />
              )
            ) : (
              <View style={styles.noVideo}>
                <Icon name="video-off" size={60} color={colors.textSecondary} />
                <Text
                  style={[styles.noVideoText, { color: colors.textSecondary }]}
                >
                  No hay video disponible para esta lección
                </Text>
              </View>
            )}

            {/* Botón de completar */}
            {(() => {
              const lessons = course.course_lessons || [];
              const index = lessons.findIndex(
                (l) => l.id === selectedLesson?.id,
              );
              return index !== -1 && !isLessonCompleted(index);
            })() && (
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  const lessons = course.course_lessons || [];
                  const index = lessons.findIndex(
                    (l) => l.id === selectedLesson.id,
                  );
                  if (index !== -1) {
                    markLessonComplete(index);
                    setSelectedLesson(null);
                  }
                }}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.completeButtonText}>
                  Marcar como completada
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  backButton: { padding: 8 },
  courseTitle: { fontSize: 22, fontWeight: "800", flex: 1, marginLeft: 16 },
  progressCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: { fontSize: 16, fontWeight: "600" },
  progressPercent: { fontSize: 20, fontWeight: "900" },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: { height: "100%" },
  progressText: { fontSize: 14, textAlign: "center" },
  lessonsCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  completedLesson: { opacity: 0.7 },
  lessonLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  lessonNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lessonNumberText: { color: "#fff", fontWeight: "bold" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: "600" },
  lessonMeta: { fontSize: 13, marginTop: 4 },
  certificateButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  certificateText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "85%",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", flex: 1 },
  videoPlayer: { width: "100%", height: 220 },
  noVideo: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  noVideoText: { marginTop: 12, fontSize: 16, textAlign: "center" },
  completeButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  completeButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
