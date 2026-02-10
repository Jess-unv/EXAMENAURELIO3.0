import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, supabaseUrl } from "../utils/supabase";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const CourseContext = createContext();

export const CourseProvider = ({ children }) => {
  const { user } = useAuth();

  const [allCourses, setAllCourses] = useState([]);
  const [adminCourses, setAdminCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);

  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ FUNCIÓN LIMPIA Y OPTIMIZADA PARA SUBIR ARCHIVOS (sin error falso de red)
  const uploadFileSimple = async (uri, fileName, folder = "") => {
    console.log(`🚀 Iniciando subida: ${fileName} → ${folder || "root"}`);
    setUploadProgress(0);

    try {
      // 1. Verificar sesión
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No autenticado. Inicia sesión.");
      }

      console.log("✅ Usuario autenticado:", session.user.email);
      setUploadProgress(10);

      // 2. Verificar archivo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error("Archivo no válido o vacío");
      }

      const fileSizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
      console.log(`📏 Tamaño: ${fileSizeMB} MB`);
      setUploadProgress(20);

      // 3. Preparar bucket y path
      const fileExt = uri.split(".").pop().toLowerCase() || "jpg";
      const mimeType = getMimeType(fileExt);

      let bucketName = "course-media";
      let fullPath = "";

      if (folder === "thumbnails") {
        fullPath = `thumbnails/${uuidv4()}.${fileExt}`;
      } else if (mimeType.startsWith("video/")) {
        bucketName = "lesson-videos";
        fullPath = `${uuidv4()}.${fileExt}`;
      } else {
        fullPath = folder
          ? `${folder}/${uuidv4()}.${fileExt}`
          : `${uuidv4()}.${fileExt}`;
      }

      // Límite de tamaño
      const maxSizeMB = mimeType.startsWith("video/") ? 100 : 10;
      if (fileInfo.size > maxSizeMB * 1024 * 1024) {
        throw new Error(
          `Archivo muy grande (${fileSizeMB} MB). Límite: ${maxSizeMB} MB`,
        );
      }

      // 4. Leer como buffer
      console.log("📥 Leyendo archivo...");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(base64);
      const buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }

      console.log(`✅ Archivo leído (${Math.ceil(base64.length / 1024)} KB)`);
      setUploadProgress(30);

      // 5. Subir con SDK oficial (método principal) → prioridad absoluta
      console.log(`📤 Subiendo con SDK a ${bucketName}/${fullPath}...`);

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, buffer, {
          contentType: mimeType,
          upsert: true, // Permite sobreescribir si ya existe
          cacheControl: "3600",
        });

      // Si el upload principal fue exitoso → salimos inmediatamente con la URL
      if (!uploadError && data) {
        console.log("✅ Subida exitosa con SDK");
        setUploadProgress(80);

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fullPath);
        console.log(`🔗 URL pública generada: ${urlData.publicUrl}`);
        setUploadProgress(100);

        return urlData.publicUrl;
      }

      // Solo si el método principal falló de verdad → intentamos alternativo
      console.warn(
        "⚠️ SDK falló:",
        uploadError?.message || "Error desconocido",
      );
      console.log("🔄 Intentando método alternativo...");

      // Llamada al alternativo
      const alternativeUrl = await uploadAlternativeMethod(
        uri,
        fullPath,
        bucketName,
        session.access_token,
      );

      // Si el alternativo también funciona → devolvemos esa URL
      console.log("✅ Subida completada (método alternativo)");
      return alternativeUrl;
    } catch (error) {
      console.error("❌ Error final en uploadFileSimple:", error.message);
      setUploadProgress(0);
      throw error;
    }
  };

  // Método alternativo (solo se ejecuta si el principal falla)
  const uploadAlternativeMethod = async (
    uri,
    fullPath,
    bucketName,
    accessToken,
  ) => {
    console.log(`🔄 Método alternativo para ${bucketName}/${fullPath}`);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(base64);
      const buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }

      const fileExt = uri.split(".").pop().toLowerCase();
      const mimeType = getMimeType(fileExt);

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fullPath}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
      }

      const responseData = await uploadResponse.json();
      console.log("✅ Upload alternativo OK:", responseData);

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fullPath}`;
      console.log(`🔗 URL pública (alternativo): ${publicUrl}`);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error("❌ Falló método alternativo:", error.message);
      throw error;
    }
  };

  // Función para obtener MIME type
  const getMimeType = (ext) => {
    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      webm: "video/webm",
      mkv: "video/x-matroska",
    };
    return types[ext] || "application/octet-stream";
  };

  // ✅ Función para subir videos de lecciones
  const uploadLessonVideo = async (uri, fileName) => {
    console.log(`🎥 Subiendo video de lección: ${fileName}`);
    setUploadProgress(0);

    try {
      const cleanFileName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 100);

      const publicUrl = await uploadFileSimple(uri, cleanFileName, "");
      console.log(`✅ Video de lección subido: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("❌ Error subiendo video:", error.message);
      throw error;
    }
  };

  // ✅ Función para subir thumbnails
  const uploadThumbnail = async (uri, fileName) => {
    console.log(`🖼️ Subiendo thumbnail: ${fileName}`);

    try {
      const cleanFileName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 100);

      const publicUrl = await uploadFileSimple(
        uri,
        cleanFileName,
        "thumbnails",
      );
      console.log(`✅ Thumbnail subido: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("❌ Error subiendo thumbnail:", error.message);
      throw error;
    }
  };

  // ✅ DETECTAR TIPO DE VIDEO (FUNCIÓN CLAVE)
  const getVideoSourceType = (url) => {
    if (!url) return "none";

    // Detectar YouTube
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (youtubeRegex.test(url)) {
      return "youtube";
    }

    // Detectar si es URL local de dispositivo
    if (
      url.startsWith("file://") ||
      url.startsWith("content://") ||
      url.startsWith("asset://")
    ) {
      return "local";
    }

    // Detectar si es URL de Supabase (video directo)
    if (url.includes("supabase.co/storage")) {
      return "remote";
    }

    // Detectar si es archivo directo (.mp4, etc.)
    if (url.match(/\.(mp4|mov|avi|webm|mkv|m3u8)(\?.*)?$/i)) {
      return "remote";
    }

    return "unknown";
  };

  // ✅ Extraer ID de YouTube
  const extractYouTubeId = (url) => {
    if (!url) return null;

    // youtube.com/watch?v=ID
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];

    // youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];

    // youtube.com/embed/ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];

    return null;
  };

  // ✅ Convertir URL de YouTube a embed
  const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return url;

    const params = new URLSearchParams({
      rel: "0",
      showinfo: "0",
      modestbranding: "1",
      playsinline: "1",
      enablejsapi: "1",
      origin: "https://localhost",
      autoplay: "0",
      controls: "1",
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  // ✅ Obtener thumbnail de YouTube
  const getYouTubeThumbnail = (url, quality = "maxresdefault") => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    const qualities = {
      default: "default.jpg",
      mqdefault: "mqdefault.jpg",
      hqdefault: "hqdefault.jpg",
      sddefault: "sddefault.jpg",
      maxresdefault: "maxresdefault.jpg",
    };

    const qualityKey = qualities[quality] || qualities["hqdefault"];
    return `https://img.youtube.com/vi/${videoId}/${qualityKey}`;
  };

  // ✅ Validar URLs de video
  const isValidVideoUrl = (url) => {
    if (!url) return false;

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    const vimeoRegex =
      /^(https?:\/\/)?(www\.|player\.)?vimeo\.com\/(video\/)?(\d+).*$/;
    const supabaseRegex =
      /https:\/\/[a-zA-Z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/(lesson-videos|course-media)\/.+/;
    const directVideoRegex = /\.(mp4|mov|avi|webm|mkv|m3u8)(\?.*)?$/i;
    const localRegex = /^(file|content|asset):\/\//;

    return (
      youtubeRegex.test(url) ||
      vimeoRegex.test(url) ||
      supabaseRegex.test(url) ||
      directVideoRegex.test(url) ||
      localRegex.test(url)
    );
  };

  // ✅ Verificar si es video local
  const isLocalVideo = (url) => {
    return getVideoSourceType(url) === "local";
  };

  // ✅ Verificar si es YouTube
  const isYouTubeVideo = (url) => {
    return getVideoSourceType(url) === "youtube";
  };

  // ✅ Verificar si es video remoto (Supabase o archivo directo)
  const isRemoteVideo = (url) => {
    return getVideoSourceType(url) === "remote";
  };

  // Resto del código se mantiene igual...
  const searchCourses = (query) => {
    if (!query || !allCourses || allCourses.length === 0) return allCourses;

    const searchLower = query.toLowerCase();
    return allCourses.filter(
      (course) =>
        course?.title?.toLowerCase().includes(searchLower) ||
        course?.description?.toLowerCase().includes(searchLower) ||
        course?.category?.toLowerCase().includes(searchLower) ||
        course?.subtitle?.toLowerCase().includes(searchLower),
    );
  };

  // Cargar metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        console.log("📊 Cargando metadata...");

        const { data: categoriesData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (catError) {
          console.error("Error categorías:", catError);
          setCategories([
            {
              id: 1,
              name: "Electrónica",
              description: "Cursos de electrónica",
              icon: "chip",
            },
            {
              id: 2,
              name: "Programación",
              description: "Cursos de programación",
              icon: "laptop",
            },
          ]);
        } else {
          setCategories(categoriesData || []);
        }

        const { data: levelsData, error: lvlError } = await supabase
          .from("levels")
          .select("*")
          .order("order_index");

        if (lvlError) {
          console.error("Error niveles:", lvlError);
          setLevels([
            {
              id: 1,
              name: "Principiante",
              description: "Nivel básico",
              order_index: 1,
            },
            {
              id: 2,
              name: "Intermedio",
              description: "Nivel intermedio",
              order_index: 2,
            },
            {
              id: 3,
              name: "Avanzado",
              description: "Nivel experto",
              order_index: 3,
            },
          ]);
        } else {
          setLevels(levelsData || []);
        }

        console.log("✅ Metadata cargada");
      } catch (err) {
        console.error("❌ Error metadata:", err);
        setError(err.message);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMetadata();
  }, []);

  // Cargar cursos basado en usuario
  useEffect(() => {
    if (!user) {
      setAllCourses([]);
      setAdminCourses([]);
      return;
    }

    if (user.role === "admin") {
      loadAdminCourses(user.id);
      loadAllCourses();
    } else {
      loadAllCourses();
    }
  }, [user?.id, user?.role]);

  // Funciones auxiliares
  const getCategoryById = (categoryId) => {
    if (!categoryId) return { name: "General", description: "", icon: "book" };
    return (
      categories.find((c) => c.id === categoryId) || {
        name: "General",
        description: "",
        icon: "book",
      }
    );
  };

  const getLevelById = (levelId) => {
    if (!levelId) return { name: "Principiante", description: "Nivel básico" };
    return (
      levels.find((l) => l.id === levelId) || {
        name: "Principiante",
        description: "Nivel básico",
      }
    );
  };

  // Formatear curso desde Supabase
  const formatCourseFromSupabase = (course) => {
    if (!course) return null;

    const category = course.category_id
      ? getCategoryById(course.category_id)
      : null;
    const level = course.level_id
      ? getLevelById(course.level_id)
      : {
          name: course.level || "Principiante",
          description: course.level || "Nivel básico",
        };

    const lessons = course.course_lessons || course.lessons || [];

    // Determinar tipo de video para cada lección
    const formattedLessons = lessons.map((lesson) => ({
      ...lesson,
      video_source_type: lesson.video_source_type || "url",
      video_type: getVideoSourceType(lesson.video_url || ""),
    }));

    return {
      id: course.id,
      admin_id: course.admin_id,
      title: course.title || "",
      subtitle: course.subtitle || "",
      description: course.description || "",
      what_will_learn: course.what_will_learn || "",
      price: Number.parseFloat(course.price) || 0,
      discount_price: course.discount_price
        ? Number.parseFloat(course.discount_price)
        : null,
      thumbnail_url: course.thumbnail_url || null,
      cover_url: course.cover_url || null,
      video_url: null,
      lessons: formattedLessons,
      level: level.name,
      level_id: course.level_id,
      level_description: level.description,
      category: category?.name || "General",
      category_id: course.category_id,
      category_description: category?.description || "",
      category_icon: category?.icon || "book",
      duration_hours: course.duration_hours || 0,
      language: course.language || "Español",
      is_published: course.is_published || false,
      published_at: course.published_at,
      created_at: course.created_at,
      updated_at: course.updated_at,
      adminName: course.admin?.name || "Admin",
      adminEmail: course.admin?.email || "",
    };
  };

  // Formatear curso para Supabase
  const formatCourseToSupabase = (courseData) => {
    return {
      admin_id: courseData.admin_id || user?.id,
      title: courseData.title?.trim(),
      subtitle: courseData.subtitle?.trim() || null,
      description: courseData.description?.trim() || null,
      what_will_learn: courseData.what_will_learn?.trim() || null,
      price: Number.parseFloat(courseData.price) || 0,
      discount_price: courseData.discount_price
        ? Number.parseFloat(courseData.discount_price)
        : null,
      thumbnail_url: courseData.thumbnail_url,
      cover_url: courseData.cover_url,
      video_url: null,
      trailer_url: null,
      level_id: courseData.level_id || courseData.level,
      category_id: courseData.category_id || null,
      duration_hours: Number.parseFloat(courseData.duration_hours) || 0,
      language: courseData.language || "Español",
      is_published: courseData.is_published || false,
      published_at: courseData.is_published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
  };

  // ✅ Cargar todos los cursos públicos
  const loadAllCourses = useCallback(async () => {
    try {
      console.log("📚 Cargando cursos públicos...");
      setLoadingAll(true);

      const { data, error } = await supabase
        .from("courses")
        .select(
          `
          *,
          admin:users(id, name, email),
          level:levels(name, description),
          category:categories(name, description, icon),
          course_lessons(*)
        `,
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error en query:", error);
        throw error;
      }

      console.log("✅ Cursos cargados:", data?.length || 0);

      const formatted = (data || []).map(formatCourseFromSupabase);
      setAllCourses(formatted);

      return formatted;
    } catch (err) {
      console.error("❌ Error cargando cursos públicos:", err);
      setError(err.message);
      setAllCourses([]);
      return [];
    } finally {
      setLoadingAll(false);
    }
  }, [categories, levels]);

  // ✅ Cargar cursos del administrador
  const loadAdminCourses = useCallback(
    async (adminId) => {
      if (!adminId) return [];

      try {
        console.log(`👨‍🏫 Cargando cursos del admin: ${adminId}`);
        setLoadingAdmin(true);

        const { data, error } = await supabase
          .from("courses")
          .select(
            `
          *,
          admin:users(id, name, email),
          level:levels(name, description),
          category:categories(name, description, icon),
          course_lessons(*)
        `,
          )
          .eq("admin_id", adminId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Error en query admin:", error);
          throw error;
        }

        console.log("✅ Cursos admin cargados:", data?.length || 0);
        const formatted = (data || []).map(formatCourseFromSupabase);
        setAdminCourses(formatted);

        return formatted;
      } catch (err) {
        console.error("❌ Error cargando cursos del admin:", err);
        setError(err.message);
        setAdminCourses([]);
        return [];
      } finally {
        setLoadingAdmin(false);
      }
    },
    [categories, levels],
  );

  // ✅ Función MEJORADA para crear curso
  const addCourse = async (courseData) => {
    try {
      console.log("➕ Creando curso...");
      console.log("📋 Datos recibidos:", {
        title: courseData.title,
        thumbnail: courseData.thumbnail_url ? "✅" : "❌",
        category: courseData.category_id,
        level: courseData.level_id,
        lessonsCount: courseData.lessons?.length || 0,
      });

      // Validaciones
      if (!courseData.title?.trim())
        throw new Error("El título es obligatorio");
      if (!courseData.thumbnail_url)
        throw new Error("La imagen de portada es obligatoria");
      if (!courseData.category_id)
        throw new Error("La categoría es obligatoria");
      if (!courseData.level_id) throw new Error("El nivel es obligatorio");

      // Preparar datos del curso
      const courseToInsert = {
        admin_id: courseData.admin_id || user?.id,
        title: courseData.title.trim(),
        subtitle: courseData.subtitle?.trim() || null,
        description: courseData.description?.trim() || null,
        what_will_learn: courseData.what_will_learn?.trim() || null,
        price: Number.parseFloat(courseData.price) || 0,
        discount_price: courseData.discount_price
          ? Number.parseFloat(courseData.discount_price)
          : null,
        thumbnail_url: courseData.thumbnail_url,
        cover_url: courseData.cover_url || null,
        video_url: null,
        trailer_url: null,
        level_id: courseData.level_id,
        category_id: courseData.category_id,
        duration_hours: Number.parseFloat(courseData.duration_hours) || 10,
        language: courseData.language || "Español",
        is_published: courseData.is_published || false,
        published_at: courseData.is_published ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("📤 Insertando curso en la base de datos...");

      // 1. Crear el curso
      const { data: courseResult, error: courseError } = await supabase
        .from("courses")
        .insert([courseToInsert])
        .select()
        .single();

      if (courseError) {
        console.error("❌ Error creando curso:", courseError);
        throw new Error(`Error al crear curso: ${courseError.message}`);
      }

      console.log("✅ Curso creado con ID:", courseResult.id);

      // 2. Insertar lecciones si existen
      if (courseData.lessons && courseData.lessons.length > 0) {
        console.log(`📚 Preparando ${courseData.lessons.length} lecciones...`);

        const lessonsToInsert = courseData.lessons.map((lesson, index) => {
          // Determinar tipo de video basado en la URL
          const videoSourceType = lesson.video_source_type || "url";
          const videoType = getVideoSourceType(lesson.video_url || "");

          return {
            course_id: courseResult.id,
            title: lesson.title || `Lección ${index + 1}`,
            description: lesson.description || null,
            video_url: lesson.video_url || null,
            duration: lesson.duration || 0,
            order_index: lesson.order_index || index,
            is_preview: lesson.is_preview || false,
            video_source_type: videoSourceType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        console.log("📤 Insertando lecciones en course_lessons...");

        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .insert(lessonsToInsert)
          .select();

        if (lessonsError) {
          console.error("❌ Error insertando lecciones:", lessonsError);
          console.error("❌ Detalles:", JSON.stringify(lessonsError, null, 2));
          throw new Error(
            `Error al insertar lecciones: ${lessonsError.message}`,
          );
        } else {
          console.log(
            `✅ ${lessonsData?.length || 0} lecciones insertadas correctamente`,
          );
        }
      } else {
        console.log("ℹ️ No hay lecciones para insertar");
      }

      // 3. Obtener el curso completo con relaciones
      console.log("🔄 Obteniendo curso completo...");
      const { data: fullCourse, error: fetchError } = await supabase
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
        .eq("id", courseResult.id)
        .single();

      let newCourse;
      if (fetchError) {
        console.error("❌ Error obteniendo curso completo:", fetchError);
        newCourse = formatCourseFromSupabase(courseResult);
      } else {
        newCourse = formatCourseFromSupabase(fullCourse);
      }

      console.log("✅ Curso formateado:", newCourse.title);

      // 4. Actualizar estado local
      if (user?.role === "admin") {
        setAdminCourses((prev) => [newCourse, ...prev]);
      }

      if (newCourse.is_published) {
        setAllCourses((prev) => [newCourse, ...prev]);
      }

      return {
        success: true,
        course: newCourse,
        message: `Curso "${newCourse.title}" creado exitosamente`,
      };
    } catch (err) {
      console.error("❌ Error creando curso:", err);
      return {
        success: false,
        error: err.message || "Error al crear el curso",
      };
    }
  };

  // Función para actualizar curso
  const updateCourse = async (courseId, updates, files = {}) => {
    try {
      console.log("✏️ Actualizando curso:", courseId);

      const { data: currentCourse, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (fetchError) throw fetchError;

      let thumbnailUrl = updates.thumbnail_url || currentCourse.thumbnail_url;

      // Subir thumbnail si se proporciona
      if (files.thumbnailUri) {
        thumbnailUrl = await uploadThumbnail(
          files.thumbnailUri,
          `thumbnail_${Date.now()}.jpg`,
        );
      }

      const updatedData = {
        ...updates,
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("courses")
        .update(formatCourseToSupabase(updatedData))
        .eq("id", courseId)
        .select(
          `
          *,
          admin:users(name, email),
          level:levels(name, description),
          category:categories(name, description, icon),
          course_lessons(*)
        `,
        )
        .single();

      if (error) throw error;

      const formatted = formatCourseFromSupabase(data);

      if (user?.role === "admin") {
        setAdminCourses((prev) =>
          prev.map((c) => (c.id === formatted.id ? formatted : c)),
        );
      }

      if (formatted.is_published) {
        setAllCourses((prev) =>
          prev.map((c) => (c.id === formatted.id ? formatted : c)),
        );
      }

      return { success: true, course: formatted };
    } catch (err) {
      console.error("❌ Error actualizando curso:", err);
      return { success: false, error: err.message };
    }
  };

  // Función para eliminar curso
  const deleteCourse = async (courseId) => {
    try {
      console.log("🗑️ Eliminando curso:", courseId);

      // 1. Obtener lecciones para eliminar sus videos después
      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("video_url")
        .eq("course_id", courseId);

      // 2. Eliminar las lecciones
      const { error: lessonsError } = await supabase
        .from("course_lessons")
        .delete()
        .eq("course_id", courseId);

      if (lessonsError) {
        console.error("⚠️ Error eliminando lecciones:", lessonsError);
      }

      // 3. Eliminar el curso
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;

      // 4. Eliminar archivos de storage (opcional, en background)
      if (lessons) {
        lessons.forEach((lesson) => {
          if (lesson.video_url) {
            deleteFileFromStorage(lesson.video_url).catch(console.error);
          }
        });
      }

      // 5. Actualizar estado local
      if (user?.role === "admin") {
        setAdminCourses((prev) => prev.filter((c) => c.id !== courseId));
      }

      setAllCourses((prev) => prev.filter((c) => c.id !== courseId));

      return { success: true, message: "Curso eliminado exitosamente" };
    } catch (err) {
      console.error("❌ Error eliminando curso:", err);
      return { success: false, error: err.message };
    }
  };

  // Función para publicar/despublicar curso
  const publishCourse = async (courseId, publish = true) => {
    try {
      console.log(
        `${publish ? "📢 Publicando" : "🔒 Despublicando"} curso:`,
        courseId,
      );

      const { data, error } = await supabase
        .from("courses")
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;

      if (user?.role === "admin") {
        setAdminCourses((prev) =>
          prev.map((c) =>
            c.id === courseId ? { ...c, is_published: publish } : c,
          ),
        );
      }

      if (publish) {
        await loadAllCourses();
      } else {
        setAllCourses((prev) => prev.filter((c) => c.id !== courseId));
      }

      return {
        success: true,
        course: data,
        message: publish
          ? "Curso publicado exitosamente"
          : "Curso despublicado",
      };
    } catch (err) {
      console.error("❌ Error publicando curso:", err);
      return { success: false, error: err.message };
    }
  };

  // Refrescar cursos
  const refreshCourses = async () => {
    console.log("🔄 Refrescando cursos...");

    if (user?.role === "admin" && user?.id) {
      await loadAdminCourses(user.id);
    }

    return await loadAllCourses();
  };

  // Verificar si un curso es nuevo
  const isNewCourse = (createdAt) => {
    if (!createdAt) return false;
    const courseDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - courseDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Eliminar archivo de storage
  const deleteFileFromStorage = async (fileUrl) => {
    try {
      if (!fileUrl) return { success: true };

      console.log("🗑️ Eliminando archivo:", fileUrl);

      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split("/");

      let bucketIndex = -1;
      let bucketName = "";

      const buckets = ["lesson-videos", "course-media"];

      for (let i = 0; i < pathParts.length; i++) {
        if (buckets.includes(pathParts[i])) {
          bucketIndex = i;
          bucketName = pathParts[i];
          break;
        }
      }

      if (bucketIndex === -1) {
        console.log("⚠️ No se pudo identificar el bucket");
        return { success: false, error: "Bucket no identificado" };
      }

      const filePath = pathParts.slice(bucketIndex + 1).join("/");

      console.log(`🗑️ Bucket: ${bucketName}, Path: ${filePath}`);

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error("❌ Error eliminando archivo:", error);
        return { success: false, error: error.message };
      } else {
        console.log("✅ Archivo eliminado");
        return { success: true };
      }
    } catch (err) {
      console.error("❌ Error deleteFileFromStorage:", err);
      return { success: false, error: err.message };
    }
  };

  // Valor del contexto
  const value = {
    courses: allCourses,
    myCourses: user?.role === "admin" ? adminCourses : [],
    categories,
    levels,
    loading: loadingAll,
    adminLoading: loadingAdmin,
    metaLoading: loadingMeta,
    error,
    uploadProgress,

    // Funciones principales
    addCourse,
    updateCourse,
    deleteCourse,
    publishCourse,
    refreshCourses,
    searchCourses,

    // Funciones de subida
    uploadFileSimple,
    uploadLessonVideo,
    uploadThumbnail,
    deleteFileFromStorage,

    // Funciones de carga
    loadAllCourses,
    loadAdminCourses,
    getCategoryById,
    getLevelById,

    // Funciones de video NUEVAS
    isValidVideoUrl,
    getVideoSourceType,
    extractYouTubeId,
    getYouTubeEmbedUrl,
    getYouTubeThumbnail,
    isLocalVideo,
    isYouTubeVideo,
    isRemoteVideo,

    // Funciones de UI
    getCategoryColor: (categoryName) => {
      const colors = {
        Electrónica: "#6366F1",
        Programación: "#10B981",
        Tecnología: "#F59E0B",
        General: "#6B7280",
      };
      return colors[categoryName] || "#6B7280";
    },
    getLevelColor: (levelName) => {
      const colors = {
        Principiante: "#3B82F6",
        Intermedio: "#F59E0B",
        Avanzado: "#EF4444",
      };
      return colors[levelName] || "#6B7280";
    },
    isNewCourse,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context)
    throw new Error("useCourses debe usarse dentro de CourseProvider");
  return context;
};
