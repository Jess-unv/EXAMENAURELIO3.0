import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useEnrollments } from "../context/EnrollmentContext"; // CAMBIADO: EnrollmentContext
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";

// Función para formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return "Fecha no disponible";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Función para obtener color según estado
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "completed":
      return "#10B981"; // Verde
    case "pending":
    case "pending":
      return "#F59E0B"; // Amarillo
    case "cancelled":
    case "cancelled":
      return "#EF4444"; // Rojo
    default:
      return "#6B7280"; // Gris
  }
};

// Función para obtener ícono según estado
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "completed":
      return "check-circle";
    case "pending":
    case "pending":
      return "clock";
    case "cancelled":
    case "cancelled":
      return "cancel";
    default:
      return "help-circle";
  }
};

export default function EnrollmentHistoryScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { enrollments, loading, refreshEnrollments } = useEnrollments(); // CAMBIADO: useEnrollments

  const [refreshing, setRefreshing] = useState(false);
  const [enrichedEnrollments, setEnrichedEnrollments] = useState([]);
  const [enrichedLoading, setEnrichedLoading] = useState(false);

  // Obtener información detallada de las inscripciones
  const fetchEnrichedEnrollments = useCallback(async () => {
    if (!enrollments || enrollments.length === 0) {
      setEnrichedEnrollments([]);
      return;
    }

    setEnrichedLoading(true);
    try {
      const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            // Obtener información del curso
            const { data: courseData, error: courseError } = await supabase
              .from("courses")
              .select("title, thumbnail_url, price, level, duration_hours, description")
              .eq("id", enrollment.course_id)
              .single();

            if (courseError) {
              console.error("Error obteniendo curso:", courseError);
              return {
                ...enrollment,
                course_title: "Curso no disponible",
                thumbnail_url: null,
                course_price: enrollment.amount || 0,
              };
            }

            // Obtener información del instructor (admin)
            const { data: instructorData, error: instructorError } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("id", enrollment.provider_id || enrollment.admin_id)
              .single();

            return {
              ...enrollment,
              course_title: courseData.title || "Curso sin título",
              thumbnail_url: courseData.thumbnail_url,
              course_price: courseData.price || enrollment.amount || 0,
              course_level: courseData.level,
              course_duration: courseData.duration_hours,
              course_description: courseData.description,
              instructor_name: instructorData?.name || "Instructor",
              instructor_avatar: instructorData?.avatar_url,
            };
          } catch (error) {
            console.error("Error enriqueciendo inscripción:", error);
            return {
              ...enrollment,
              course_title: "Error cargando curso",
              thumbnail_url: null,
              course_price: enrollment.amount || 0,
            };
          }
        })
      );

      // Ordenar por fecha más reciente primero
      enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setEnrichedEnrollments(enriched);
    } catch (error) {
      console.error("Error general obteniendo inscripciones:", error);
      Alert.alert("Error", "No se pudieron cargar las inscripciones");
    } finally {
      setEnrichedLoading(false);
    }
  }, [enrollments]);

  useEffect(() => {
    if (enrollments && enrollments.length > 0) {
      fetchEnrichedEnrollments();
    } else {
      setEnrichedEnrollments([]);
    }
  }, [enrollments, fetchEnrichedEnrollments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEnrollments();
    await fetchEnrichedEnrollments();
    setRefreshing(false);
  }, [refreshEnrollments, fetchEnrichedEnrollments]);

  const handleViewCourse = (enrollment) => {
    navigation.navigate("CourseView", {
      courseId: enrollment.course_id,
      enrollmentId: enrollment.id,
    });
  };

  const handleCancelEnrollment = async (enrollmentId) => {
    Alert.alert(
      "Cancelar inscripción",
      "¿Estás seguro de que deseas cancelar esta inscripción?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("enrollments")
                .update({ status: "cancelled" })
                .eq("id", enrollmentId);

              if (error) throw error;

              Alert.alert("Éxito", "Inscripción cancelada");
              await refreshEnrollments();
            } catch (error) {
              console.error("Error cancelando inscripción:", error);
              Alert.alert("Error", "No se pudo cancelar la inscripción");
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <Icon name="history" size={80} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No tienes inscripciones
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Los cursos en los que te inscribas aparecerán aquí
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("StudentTabs", { screen: "StudentHome" })}
      >
        <Text style={styles.emptyButtonText}>Explorar cursos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnrollmentCard = (enrollment) => (
    <TouchableOpacity
      key={enrollment.id}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => handleViewCourse(enrollment)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderId, { color: colors.text }]}>
            Inscripción #{enrollment.id.slice(0, 8)}
          </Text>
          <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
            {formatDate(enrollment.created_at)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(enrollment.status) + "20" },
          ]}
        >
          <Icon
            name={getStatusIcon(enrollment.status)}
            size={14}
            color={getStatusColor(enrollment.status)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(enrollment.status) },
            ]}
          >
            {enrollment.status?.toUpperCase() || "PENDIENTE"}
          </Text>
        </View>
      </View>

      <View style={styles.courseInfo}>
        {enrollment.thumbnail_url ? (
          <Image
            source={{ uri: enrollment.thumbnail_url }}
            style={styles.courseImage}
          />
        ) : (
          <View style={[styles.courseImage, { backgroundColor: colors.border }]}>
            <Icon name="book" size={30} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.courseDetails}>
          <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
            {enrollment.course_title}
          </Text>
          <Text style={[styles.instructorText, { color: colors.textSecondary }]}>
            <Icon name="person" size={12} /> {enrollment.instructor_name}
          </Text>
          {enrollment.course_level && (
            <Text style={[styles.courseMeta, { color: colors.textSecondary }]}>
              {enrollment.course_level} • {enrollment.course_duration || 0}h
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <View style={styles.priceSection}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
            Inversión:
          </Text>
          <Text style={[styles.price, { color: colors.text }]}>
            ${(enrollment.course_price || enrollment.amount || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.actions}>
          {enrollment.status === "pending" && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: "#EF4444" }]}
              onPress={() => handleCancelEnrollment(enrollment.id)}
            >
              <Text style={[styles.cancelText, { color: "#EF4444" }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.primary }]}
            onPress={() => handleViewCourse(enrollment)}
          >
            <Text style={[styles.viewText, { color: colors.primary }]}>
              Ver Curso
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Mis Inscripciones
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Historial de todos tus cursos
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.refreshButton, { backgroundColor: colors.primary + "20" }]}
          >
            <Icon name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {(loading || enrichedLoading) && enrichedEnrollments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Cargando inscripciones...
            </Text>
          </View>
        ) : enrichedEnrollments.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Total: {enrichedEnrollments.length} inscripción(es)
            </Text>
            {enrichedEnrollments.map(renderEnrollmentCard)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 4,
  },
  courseInfo: {
    flexDirection: "row",
    marginBottom: 15,
  },
  courseImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  courseDetails: {
    flex: 1,
    justifyContent: "center",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  instructorText: {
    fontSize: 13,
    marginBottom: 4,
  },
  courseMeta: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceSection: {},
  priceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
    maxWidth: 300,
  },
  emptyButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});