import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCourses } from "../context/CourseContext";
import { supabase } from "../utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import VideoPlayer from "../components/VideoPlayer";

const { width, height } = Dimensions.get("window");

export default function CourseDetailScreen({ route, navigation }) {
  const { courseId, courseData: paramCourseData } = route.params || {};
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { courses, myCourses } = useCourses();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrollment, setEnrollment] = useState(null); // ← AGREGADO: estado para enrollment

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    loadCourse();
  }, [courseId, courses, myCourses]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      let courseData = paramCourseData;

      if (!courseData && courseId) {
        const allCourses = [...(courses || []), ...(myCourses || [])];
        courseData = allCourses.find((c) => c.id === courseId);

        if (!courseData) {
          const { data, error } = await supabase
            .from("courses")
            .select(
              `
              *,
              admin:users(name, email),
              level:levels(name, description),
              category:categories(name, description, icon),
              course_lessons(*)
            `,
            )
            .eq("id", courseId)
            .single();

          if (error) throw error;
          courseData = data;
        }
      }

      if (!courseData) throw new Error("No se pudo cargar el curso");

      const formattedCourse = {
        id: courseData.id,
        title: courseData.title || "Sin título",
        subtitle: courseData.subtitle || "",
        description: courseData.description || "",
        price: Number.parseFloat(courseData.price) || 0,
        discount_price: Number.parseFloat(courseData.discount_price) || null,
        thumbnail_url: courseData.thumbnail_url,
        cover_url: courseData.cover_url,
        level: courseData.level?.name || courseData.level || "Principiante",
        category: courseData.category?.name || "General",
        duration_hours: courseData.duration_hours || 0,
        language: courseData.language || "Español",
        is_published: courseData.is_published || false,
        lessons: courseData.course_lessons || courseData.lessons || [],
        adminName: courseData.admin?.name || "Admin",
        adminEmail: courseData.admin?.email || "",
      };

      setCourse(formattedCourse);

      if (user?.id) {
        const { data: enrollmentData, error } = await supabase
          .from("enrollments")
          .select("id, progress")
          .eq("client_id", user.id)
          .eq("course_id", formattedCourse.id)
          .maybeSingle();

        if (error) throw error;

        setIsEnrolled(!!enrollmentData);
        setEnrollment(enrollmentData); // ← Guardamos el enrollment para usarlo en actualizaciones
        setProgress(enrollmentData?.progress || 0);
      }
    } catch (err) {
      console.error("Error cargando curso:", err);
      Alert.alert("Error", "No pudimos cargar los detalles", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async () => {
    if (!enrollment || !selectedLesson) return;

    try {
      const totalLessons = course.lessons?.length || 1;
      const currentIndex = course.lessons.findIndex(
        (l) => l.id === selectedLesson.id,
      );
      if (currentIndex === -1) return;

      const newProgress = Math.min(
        100,
        Math.round(
          (((progress / 100) * totalLessons + 1) / totalLessons) * 100,
        ),
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

      setProgress(newProgress);

      if (newProgress === 100) {
        Alert.alert(
          "¡Felicidades!",
          "Has completado el curso. Tu certificado está listo.",
        );
      }
    } catch (err) {
      console.error("Error marcando lección:", err);
      Alert.alert("Error", "No se pudo actualizar el progreso");
    }
  };

  const handleNextLesson = () => {
    if (!course?.lessons?.length || !selectedLesson) return;

    const currentIndex = course.lessons.findIndex(
      (l) => l.id === selectedLesson.id,
    );
    if (currentIndex === -1) return;

    markLessonComplete();

    if (currentIndex >= course.lessons.length - 1) {
      setVideoModalVisible(false);
      return;
    }

    const nextLesson = course.lessons[currentIndex + 1];
    setSelectedLesson(nextLesson);
  };

  const handleEnroll = async () => {
    console.log("Botón Inscribirse presionado - isEnrolled:", isEnrolled);

    if (!user) {
      Alert.alert("Inicia sesión", "Necesitas una cuenta para inscribirte.", [
        { text: "Cancelar" },
        {
          text: "Ir a login",
          onPress: () => navigation.navigate("AuthScreen"),
        },
      ]);
      return;
    }

    if (isEnrolled) {
      startCourse();
      return;
    }

    setEnrolling(true);
    try {
      if (course.price === 0) {
        const { error } = await supabase.from("enrollments").insert({
          client_id: user.id,
          course_id: course.id,
          price_paid: 0,
          payment_status: "paid",
          enrolled_at: new Date().toISOString(),
        });

        if (error) throw error;

        setIsEnrolled(true);
        Alert.alert("¡Éxito!", "Ya puedes acceder al contenido.");
      } else {
        navigation.navigate("Payment", {
          courseId: course.id,
          courseTitle: course.title,
          courseThumbnail: course.thumbnail_url,
        });
      }
    } catch (err) {
      console.error("Error en handleEnroll:", err);
      Alert.alert("Error", "No se pudo procesar la inscripción.");
    } finally {
      setEnrolling(false);
    }
  };

  const startCourse = () => {
    if (!course?.lessons?.length) {
      Alert.alert("Aviso", "Aún no hay lecciones.");
      return;
    }
    const firstLesson =
      course.lessons.find((l) => l.video_url) || course.lessons[0];
    playVideo(firstLesson);
  };

  const playVideo = (lesson) => {
    if (!lesson?.video_url) {
      Alert.alert("Sin video", "Esta lección no tiene video.");
      return;
    }
    setSelectedLesson(lesson);
    setVideoModalVisible(true);
  };

  const renderLessons = (inModal = false) => {
    if (!course?.lessons?.length) {
      return (
        <View style={styles.noLessons}>
          <Icon
            name="video-off"
            size={40}
            color={inModal ? "#666" : colors.textSecondary}
          />
          <Text style={{ color: inModal ? "#aaa" : colors.textSecondary }}>
            Próximamente contenido.
          </Text>
        </View>
      );
    }

    return course.lessons.map((lesson, index) => {
      const isLocked = !isEnrolled && course.price > 0 && index > 0;
      const isPlaying = selectedLesson?.id === lesson.id;

      return (
        <TouchableOpacity
          key={lesson.id || index}
          style={[
            inModal ? styles.modalLessonItem : styles.lessonItem,
            {
              backgroundColor: inModal
                ? isPlaying
                  ? "#1e293b"
                  : "transparent"
                : colors.background,
              opacity: isLocked ? 0.6 : 1,
              borderLeftWidth: inModal && isPlaying ? 4 : 0,
              borderLeftColor: colors.primary,
            },
          ]}
          onPress={() =>
            isLocked ? (inModal ? null : handleEnroll()) : playVideo(lesson)
          }
        >
          <View
            style={[
              styles.lessonIndex,
              {
                backgroundColor: isPlaying
                  ? colors.primary
                  : colors.primary + "20",
              },
            ]}
          >
            {isPlaying ? (
              <Icon name="play" size={16} color="#fff" />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                {index + 1}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text
              style={[
                inModal ? styles.modalLessonTitle : styles.lessonTitle,
                {
                  color: inModal ? (isPlaying ? "#fff" : "#ccc") : colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {lesson.title}
            </Text>
            <Text
              style={{
                color: inModal ? "#888" : colors.textSecondary,
                fontSize: 12,
              }}
            >
              {lesson.duration || 0} min • Video
            </Text>
          </View>
          <Icon
            name={
              isLocked
                ? "lock"
                : isPlaying
                  ? "volume-high"
                  : "play-circle-outline"
            }
            size={22}
            color={
              isLocked
                ? "#666"
                : isPlaying
                  ? colors.primary
                  : inModal
                    ? "#555"
                    : colors.primary
            }
          />
        </TouchableOpacity>
      );
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const originalPrice = course.price;
  const discountedPrice = course.discount_price;
  const hasDiscount = discountedPrice && discountedPrice < originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : 0;

  const handleShareCertificate = () => {
    Alert.alert(
      "Certificado",
      "Puedes tomar una captura de pantalla o compartir esta pantalla",
      [
        { text: "OK" },
        {
          text: "Compartir",
          onPress: () =>
            Alert.alert("Compartir", "Usa la función de compartir del sistema"),
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: course.thumbnail_url }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{course.category}</Text>
            </View>
            <Text style={styles.mainTitle}>{course.title}</Text>
          </View>
        </View>

        {/* INFO GRID */}
        <View style={[styles.floatingCard, { backgroundColor: colors.card }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="translate" size={20} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.text }]}>
                {course.language}
              </Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Icon name="signal" size={20} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.text }]}>
                {course.level}
              </Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Icon name="clock-outline" size={20} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.text }]}>
                {course.duration_hours}h
              </Text>
            </View>
          </View>
        </View>

        {/* PRICING & BUTTON */}
        <View style={styles.actionSection}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              INVERSIÓN
            </Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.mainPrice, { color: colors.text }]}>
                {hasDiscount
                  ? `$${discountedPrice}`
                  : originalPrice === 0
                    ? "GRATIS"
                    : `$${originalPrice}`}
              </Text>
              {hasDiscount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    -{discountPercent}%
                  </Text>
                </View>
              )}
            </View>
            {hasDiscount && (
              <Text style={styles.oldPrice}>Antes: ${originalPrice}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: isEnrolled ? "#10b981" : colors.primary },
            ]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.mainButtonText}>
                  {isEnrolled ? "Continuar" : "Inscribirse"}
                </Text>
                <Icon
                  name={isEnrolled ? "play" : "cart"}
                  size={20}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Descripción del curso
          </Text>
          <Text
            style={[styles.descriptionBody, { color: colors.textSecondary }]}
          >
            {course.description || "Sin descripción disponible."}
          </Text>
        </View>

        {/* LESSONS LIST */}
        <View
          style={[
            styles.sectionContainer,
            styles.lessonsWrapper,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.lessonsHeader}>
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.text, marginBottom: 0 },
              ]}
            >
              Curso de Introducción
            </Text>
            <View style={styles.lessonCountBadge}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {course.lessons?.length || 0} vídeos
              </Text>
            </View>
          </View>
          <View style={styles.lessonsDivider} />
          {renderLessons(false)}
        </View>

        {/* CERTIFICADO */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Certificado de Finalización
          </Text>

          {progress === 100 ? (
            <View
              style={[styles.certificateCard, { backgroundColor: "#ffffff" }]}
            >
              <LinearGradient
                colors={["#4f46e5", "#7c3aed"]}
                style={styles.certificateGradient}
              >
                <View style={styles.certificateContent}>
                  <Text style={styles.certificateTitle}>
                    Certificado de Finalización
                  </Text>

                  <Text style={styles.certificateSubtitle}>
                    Se otorga este certificado a
                  </Text>

                  <Text style={styles.certificateName}>
                    {user?.name || "Estudiante"}
                  </Text>

                  <Text style={styles.certificateSubtitle}>
                    por completar satisfactoriamente
                  </Text>

                  <Text style={styles.certificateCourse}>{course.title}</Text>

                  <Text style={styles.certificateDate}>
                    Fecha de emisión: {new Date().toLocaleDateString("es-MX")}
                  </Text>
                </View>
              </LinearGradient>

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleShareCertificate}
              >
                <Text style={styles.shareButtonText}>
                  Compartir / Descargar
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.certificateLocked,
                { backgroundColor: colors.card },
              ]}
            >
              <Icon name="lock" size={48} color="#9ca3af" />
              <Text
                style={[styles.lockedText, { color: colors.textSecondary }]}
              >
                Completa el curso para reclamar tu certificado
              </Text>
              <Text style={[styles.lockedProgress, { color: colors.text }]}>
                Progreso actual: {progress}%
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE VIDEO */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <View style={styles.playerWrapper}>
            <VideoPlayer
              videoUrl={selectedLesson?.video_url}
              style={styles.player}
              autoPlay
              onEnd={handleNextLesson}
            />
            <TouchableOpacity
              onPress={() => setVideoModalVisible(false)}
              style={styles.closeBtnFloating}
            >
              <Icon name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalTabs}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "info" && styles.tabActive]}
              onPress={() => setActiveTab("info")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "info" && styles.tabTextActive,
                ]}
              >
                Información
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === "lessons" && styles.tabActive,
              ]}
              onPress={() => setActiveTab("lessons")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "lessons" && styles.tabTextActive,
                ]}
              >
                Lecciones
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {activeTab === "info" ? (
              <View style={styles.infoTabContent}>
                <Text style={styles.videoInfoTitle}>
                  {selectedLesson?.title}
                </Text>
                <View style={styles.lessonMeta}>
                  <Icon name="clock-outline" size={14} color="#888" />
                  <Text style={styles.lessonMetaText}>
                    {selectedLesson?.duration || 0} minutos
                  </Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.lessonMetaText}>Lección Actual</Text>
                </View>
                <Text style={styles.videoInfoSub}>
                  {selectedLesson?.description ||
                    "Esta lección no tiene descripción adicional."}
                </Text>
              </View>
            ) : (
              <View style={styles.lessonsTabContent}>
                {renderLessons(true)}
              </View>
            )}
          </ScrollView>

          {/* Botón Siguiente lección / Finalizar */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.completeButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleNextLesson}
            >
              <Text style={styles.completeButtonText}>
                {course.lessons &&
                selectedLesson &&
                course.lessons.findIndex((l) => l.id === selectedLesson.id) ===
                  course.lessons.length - 1
                  ? "Finalizar curso"
                  : "Siguiente lección"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  heroSection: { height: height * 0.38, width: "100%" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { position: "absolute", bottom: 40, left: 20, right: 20 },
  categoryBadge: {
    backgroundColor: "#3b82f6",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  mainTitle: { color: "#fff", fontSize: 26, fontWeight: "900" },

  floatingCard: {
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 16,
    padding: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: { alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "700" },
  statSeparator: { width: 1, height: 20, backgroundColor: "#e5e7eb" },

  actionSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    marginTop: 10,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  mainPrice: { fontSize: 28, fontWeight: "900" },
  discountBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  oldPrice: {
    fontSize: 14,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    elevation: 3,
  },
  mainButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  sectionContainer: { paddingHorizontal: 20, marginTop: 25 },
  sectionLabel: { fontSize: 19, fontWeight: "800", marginBottom: 12 },
  descriptionBody: { fontSize: 15, lineHeight: 23 },

  lessonsWrapper: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    marginTop: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  lessonsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  lessonCountBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lessonsDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: 15,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  lessonIndex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  lessonTitle: { fontWeight: "700", fontSize: 14, flex: 1 },

  modalContent: { flex: 1, backgroundColor: "#0f172a" },
  playerWrapper: { width: "100%", height: 240, backgroundColor: "#000" },
  player: { width: "100%", height: "100%" },
  closeBtnFloating: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
  },

  modalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  tabItem: { flex: 1, paddingVertical: 15, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#3b82f6" },
  tabText: { color: "#64748b", fontWeight: "bold", fontSize: 14 },
  tabTextActive: { color: "#3b82f6" },

  modalScroll: { flex: 1 },
  infoTabContent: { padding: 20 },
  videoInfoTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  lessonMeta: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  lessonMetaText: { color: "#888", fontSize: 13, marginLeft: 5 },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    marginHorizontal: 10,
  },
  videoInfoSub: { color: "#cbd5e1", lineHeight: 24, fontSize: 15 },

  lessonsTabContent: { padding: 10 },
  modalLessonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  modalLessonTitle: { fontWeight: "600", fontSize: 14, flex: 1 },
  noLessons: { padding: 40, alignItems: "center" },

  certificateCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  certificateGradient: {
    padding: 24,
    alignItems: "center",
  },
  certificateContent: {
    alignItems: "center",
  },
  certificateTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  certificateSubtitle: {
    color: "#e0e7ff",
    fontSize: 16,
    marginBottom: 8,
  },
  certificateName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginVertical: 12,
    textAlign: "center",
  },
  certificateCourse: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 12,
  },
  certificateDate: {
    color: "#c7d2fe",
    fontSize: 14,
    marginTop: 20,
  },
  shareButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  certificateLocked: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 12,
    elevation: 2,
  },
  lockedText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  lockedProgress: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },

  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#2d3748",
  },
  completeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
