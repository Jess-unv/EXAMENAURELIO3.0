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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useEnrollments } from "../context/EnrollmentContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";

// Formateo de fecha simple y bonita
const formatDate = (dateString) => {
  if (!dateString) return "Sin fecha";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function EnrollmentHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { myEnrollments, loading, refreshEnrollments } = useEnrollments();

  const [refreshing, setRefreshing] = useState(false);
  const [enrichedCourses, setEnrichedCourses] = useState([]);
  const [enrichedLoading, setEnrichedLoading] = useState(false);

  const fetchEnrichedCourses = useCallback(async () => {
    if (!myEnrollments?.length) {
      setEnrichedCourses([]);
      return;
    }

    setEnrichedLoading(true);

    try {
      const enriched = await Promise.all(
        myEnrollments.map(async (enrollment) => {
          try {
            const { data: course, error } = await supabase
              .from("courses")
              .select(
                `
                id,
                title,
                thumbnail_url,
                description,
                duration_hours,
                language,
                level:levels(name)
              `,
              )
              .eq("id", enrollment.course_id)
              .single();

            if (error) throw error;

            return {
              ...enrollment,
              course_title: course?.title || "Curso sin título",
              thumbnail_url: course?.thumbnail_url,
              course_description: course?.description || "Sin descripción",
              course_duration: course?.duration_hours || 0,
              course_language: course?.language || "Español",
              course_level: course?.level?.name || "No especificado",
            };
          } catch (err) {
            console.error("Error cargando curso:", err);
            return {
              ...enrollment,
              course_title: "Curso no disponible",
              thumbnail_url: null,
            };
          }
        }),
      );

      enriched.sort(
        (a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at),
      );
      setEnrichedCourses(enriched);
    } catch (error) {
      console.error("Error enriqueciendo cursos:", error);
    } finally {
      setEnrichedLoading(false);
    }
  }, [myEnrollments]);

  useEffect(() => {
    fetchEnrichedCourses();
  }, [fetchEnrichedCourses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEnrollments();
    await fetchEnrichedCourses();
    setRefreshing(false);
  }, [refreshEnrollments, fetchEnrichedCourses]);

  const handleViewCourse = (enrollment) => {
    navigation.navigate("CourseDetail", {
      // ← CAMBIADO a "CourseDetail" (tu pantalla de detalle)
      courseId: enrollment.course_id,
      enrollmentId: enrollment.id,
    });
  };

  const renderEmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: colors.background }]}
    >
      <Icon name="book-open-variant" size={80} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Aún no tienes cursos
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Explora y comienza a aprender hoy mismo
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("ClientHome")}
      >
        <Text style={styles.emptyButtonText}>Ver cursos disponibles</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCourseCard = (enrollment) => (
    <TouchableOpacity
      key={enrollment.id}
      style={[styles.courseCard, { backgroundColor: colors.card }]}
      onPress={() => handleViewCourse(enrollment)} // ← Tocar la tarjeta completa también lleva al detalle
      activeOpacity={0.88}
    >
      {enrollment.thumbnail_url ? (
        <Image
          source={{ uri: enrollment.thumbnail_url }}
          style={styles.courseImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.courseImagePlaceholder,
            { backgroundColor: colors.border },
          ]}
        >
          <Icon name="book" size={40} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.courseContent}>
        <Text
          style={[styles.courseTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {enrollment.course_title}
        </Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Icon
              name="school-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>{enrollment.course_level}</Text>
          </View>

          <View style={styles.metaItem}>
            <Icon name="clock-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{enrollment.course_duration}h</Text>
          </View>

          <View style={styles.metaItem}>
            <Icon name="translate" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{enrollment.course_language}</Text>
          </View>
        </View>

        <Text
          style={[styles.courseDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {enrollment.course_description}
        </Text>

        {/* Botón "Continuar curso" ahora sí navega al detalle */}
        <TouchableOpacity
          style={[
            styles.viewButton,
            { backgroundColor: colors.primary + "15" },
          ]}
          onPress={() => handleViewCourse(enrollment)}
        >
          <Text style={[styles.viewButtonText, { color: colors.primary }]}>
            Continuar curso →
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mis Cursos
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {enrichedCourses.length} curso
          {enrichedCourses.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading || enrichedLoading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          enrichedCourses.length === 0 && { flexGrow: 1 },
        ]}
      >
        {loading || enrichedLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : enrichedCourses.length === 0 ? (
          renderEmptyState()
        ) : (
          enrichedCourses.map(renderCourseCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  courseCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  courseImage: {
    width: "100%",
    height: 160,
  },
  courseImagePlaceholder: {
    width: "100%",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  courseContent: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  courseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  viewButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
