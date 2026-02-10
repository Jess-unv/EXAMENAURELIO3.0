// src/context/EnrollmentContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "./AuthContext";

const EnrollmentContext = createContext();

export const EnrollmentProvider = ({ children }) => {
  const { user } = useAuth();

  const [myEnrollments, setMyEnrollments] = useState([]); // inscripciones del alumno
  const [courseEnrollments, setCourseEnrollments] = useState([]); // inscripciones de un curso (para admin)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar inscripciones del usuario actual (cliente)
  const loadMyEnrollments = useCallback(async () => {
    if (!user?.id || user.role !== "client") return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          `
          *,
          course:courses (
            id,
            title,
            thumbnail_url,
            price,
            duration_hours,
            language,
            admin_id,
            is_published,
            created_at,
            level:levels (name)
          )
        `,
        )
        .eq("client_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;

      console.log("Inscripciones cargadas correctamente:", data?.length || 0);
      setMyEnrollments(data || []);
    } catch (err) {
      console.error("Error cargando mis inscripciones:", err);
      setError(err.message);
      setMyEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  // Cargar inscripciones de un curso específico (para admin)
  const loadCourseEnrollments = useCallback(
    async (courseId) => {
      if (!user?.id || user.role !== "admin" || !courseId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select(
            `
          *,
          client:users (
            id,
            name,
            email,
            phone
          )
        `,
          )
          .eq("course_id", courseId)
          .order("enrolled_at", { ascending: false });

        if (error) throw error;

        setCourseEnrollments(data || []);
      } catch (err) {
        console.error("Error cargando inscripciones del curso:", err);
        setError(err.message);
        setCourseEnrollments([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, user?.role],
  );

  // Crear una nueva inscripción
  const createEnrollment = async (enrollmentData) => {
    if (!user?.id) throw new Error("Debes iniciar sesión");

    try {
      const dataToInsert = {
        client_id: user.id,
        course_id: enrollmentData.course_id,
        price_paid: enrollmentData.price_paid || 0,
        payment_status: enrollmentData.payment_status || "pending",
        enrolled_at: new Date().toISOString(),
        progress: 0,
        completed_at: null,
      };

      const { data, error } = await supabase
        .from("enrollments")
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      // Refrescar lista del alumno
      if (user.role === "client") {
        await loadMyEnrollments();
      }

      return { success: true, enrollment: data };
    } catch (err) {
      console.error("Error creando inscripción:", err);
      return { success: false, error: err.message };
    }
  };

  // Actualizar progreso de una inscripción
  const updateProgress = async (enrollmentId, progress, completed = false) => {
    try {
      const updates = {
        progress,
        updated_at: new Date().toISOString(),
      };

      if (completed) {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("enrollments")
        .update(updates)
        .eq("id", enrollmentId)
        .eq("client_id", user.id) // seguridad extra
        .select()
        .single();

      if (error) throw error;

      // Refrescar lista del alumno
      if (user.role === "client") {
        await loadMyEnrollments();
      }

      return { success: true, enrollment: data };
    } catch (err) {
      console.error("Error actualizando progreso:", err);
      return { success: false, error: err.message };
    }
  };

  // Suscripción en tiempo real a cambios en inscripciones
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `enrollments-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
          filter:
            user.role === "admin"
              ? `course_id=in.(select id from courses where admin_id=eq.${user.id})`
              : `client_id=eq.${user.id}`,
        },
        () => {
          console.log("Cambio detectado en inscripciones");
          if (user.role === "client") loadMyEnrollments();
          // Para admin, refrescaría al seleccionar curso específico
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, loadMyEnrollments]);

  // Cargar inicial
  useEffect(() => {
    if (user) {
      if (user.role === "client") {
        loadMyEnrollments();
      }
      // Para admin se carga por curso específico cuando se necesite
    }
  }, [user, loadMyEnrollments]);

  const value = {
    myEnrollments,
    courseEnrollments,
    loading,
    error,
    createEnrollment,
    updateProgress,
    loadMyEnrollments,
    loadCourseEnrollments,
    refreshEnrollments: loadMyEnrollments,
  };

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  );
};

export const useEnrollments = () => {
  const context = useContext(EnrollmentContext);
  if (!context) {
    throw new Error("useEnrollments debe usarse dentro de EnrollmentProvider");
  }
  return context;
};
