import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const uploadMediaFile = async (fileUri, folder = 'courses', courseId = null) => {
  try {
    console.log(`📤 Iniciando subida de archivo: ${fileUri}`);
    
    // Obtener información del archivo
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('El archivo no existe');
    }

    // Leer archivo como base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determinar tipo de archivo
    const fileExt = fileUri.split('.').pop().toLowerCase();
    let contentType;
    let folderPath;

    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExt)) {
      contentType = 'video/mp4';
      folderPath = `videos/${folder}`;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      folderPath = `images/${folder}`;
    } else {
      throw new Error('Formato de archivo no soportado');
    }

    // Generar nombre único
    const fileName = `${folder}_${uuidv4()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    console.log(`📁 Subiendo a: ${filePath}`);
    console.log(`📏 Tamaño: ${fileInfo.size} bytes`);
    console.log(`🎨 Tipo: ${contentType}`);

    // Subir a Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('course-media')
      .upload(filePath, decode(base64), {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error de subida:', uploadError);
      throw uploadError;
    }

    console.log('✅ Archivo subido exitosamente');

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('course-media')
      .getPublicUrl(filePath);

    console.log(`🔗 URL pública: ${urlData.publicUrl}`);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      fileName: fileName,
      fileSize: fileInfo.size,
      contentType: contentType
    };
  } catch (error) {
    console.error('❌ Error en uploadMediaFile:', error);
    throw error;
  }
};

export const deleteMediaFile = async (filePath) => {
  try {
    if (!filePath) return { success: true };

    console.log(`🗑️ Eliminando archivo: ${filePath}`);
    
    const { error } = await supabase.storage
      .from('course-media')
      .remove([filePath]);

    if (error) throw error;

    console.log('✅ Archivo eliminado exitosamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
    return { success: false, error: error.message };
  }
};

export const getFileInfo = async (url) => {
  try {
    // Extraer path del URL de Supabase
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/course-media/')[1];
    
    if (!path) throw new Error('URL inválido');

    const { data, error } = await supabase.storage
      .from('course-media')
      .getPublicUrl(path);

    if (error) throw error;

    return {
      url: data.publicUrl,
      path: path,
      exists: true
    };
  } catch (error) {
    console.error('Error obteniendo información del archivo:', error);
    return { exists: false, error: error.message };
  }
};

export const compressVideo = async (videoUri, options = {}) => {
  try {
    console.log('🎬 Comprimiendo video...');
    
    // En React Native necesitarías una librería como react-native-compressor
    // Esta es una implementación básica - instala: npm install react-native-compressor
    
    /*
    const Compressor = require('react-native-compressor');
    
    const compressedUri = await Compressor.compress(videoUri, {
      compressionMethod: 'auto',
      maxSize: 20 * 1024 * 1024, // 20MB máximo
      quality: 0.7,
      ...options
    });
    
    console.log(`✅ Video comprimido: ${compressedUri}`);
    return compressedUri;
    */
    
    // Por ahora, devolvemos el URI original
    console.log('⚠️ Compresión no implementada, usando video original');
    return videoUri;
  } catch (error) {
    console.error('❌ Error comprimiendo video:', error);
    return videoUri; // Fallback al video original
  }
};

export const validateVideoFile = async (videoUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'El archivo no existe' };
    }

    // Verificar tamaño (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileInfo.size > maxSize) {
      return { 
        valid: false, 
        error: `El video es demasiado grande (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB). Máximo: 100MB` 
      };
    }

    // Verificar extensión
    const fileExt = videoUri.split('.').pop().toLowerCase();
    const allowedExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    
    if (!allowedExtensions.includes(fileExt)) {
      return { 
        valid: false, 
        error: `Formato no soportado: .${fileExt}. Formatos permitidos: ${allowedExtensions.join(', ')}` 
      };
    }

    return { 
      valid: true, 
      size: fileInfo.size,
      extension: fileExt 
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export const uploadCourseThumbnail = async (imageUri, courseId) => {
  try {
    console.log(`🖼️ Subiendo thumbnail para curso: ${courseId}`);
    
    const result = await uploadMediaFile(imageUri, 'thumbnails', courseId);
    
    // Actualizar la URL en la base de datos
    const { error: updateError } = await supabase
      .from('courses')
      .update({ thumbnail_url: result.url })
      .eq('id', courseId);

    if (updateError) throw updateError;

    console.log('✅ Thumbnail actualizado en la base de datos');
    return result;
  } catch (error) {
    console.error('❌ Error subiendo thumbnail:', error);
    throw error;
  }
};

export const uploadCourseVideo = async (videoUri, courseId, videoType = 'trailer') => {
  try {
    console.log(`🎥 Subiendo video (${videoType}) para curso: ${courseId}`);
    
    // Validar video primero
    const validation = await validateVideoFile(videoUri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Comprimir video si es muy grande
    let finalVideoUri = videoUri;
    if (validation.size > 20 * 1024 * 1024) { // 20MB
      console.log('📦 Video grande, comprimiendo...');
      finalVideoUri = await compressVideo(videoUri);
    }
    
    // Subir video
    const result = await uploadMediaFile(finalVideoUri, videoType === 'trailer' ? 'trailers' : 'lessons', courseId);
    
    // Actualizar en la base de datos
    const updateData = videoType === 'trailer' 
      ? { trailer_url: result.url }
      : { video_url: result.url };
    
    const { error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId);

    if (updateError) throw updateError;

    console.log(`✅ Video (${videoType}) actualizado en la base de datos`);
    return result;
  } catch (error) {
    console.error(`❌ Error subiendo video (${videoType}):`, error);
    throw error;
  }
};

// Función para subir múltiples archivos
export const uploadCourseAssets = async (assets, courseId) => {
  try {
    console.log(`📦 Subiendo múltiples assets para curso: ${courseId}`);
    
    const results = {
      thumbnail: null,
      cover: null,
      trailer: null,
      lessons: []
    };

    // Subir thumbnail
    if (assets.thumbnail) {
      console.log('🖼️ Subiendo thumbnail...');
      results.thumbnail = await uploadMediaFile(assets.thumbnail, 'thumbnails', courseId);
    }

    // Subir cover (opcional)
    if (assets.cover) {
      console.log('🖼️ Subiendo cover...');
      results.cover = await uploadMediaFile(assets.cover, 'covers', courseId);
    }

    // Subir trailer (opcional)
    if (assets.trailer) {
      console.log('🎥 Subiendo trailer...');
      results.trailer = await uploadMediaFile(assets.trailer, 'trailers', courseId);
    }

    // Subir lecciones si existen
    if (assets.lessons && Array.isArray(assets.lessons)) {
      console.log(`📚 Subiendo ${assets.lessons.length} lecciones...`);
      
      for (let i = 0; i < assets.lessons.length; i++) {
        const lesson = assets.lessons[i];
        if (lesson.videoUri) {
          console.log(`📹 Subiendo lección ${i + 1}...`);
          const lessonResult = await uploadMediaFile(lesson.videoUri, 'lessons', courseId);
          results.lessons.push({
            index: i,
            ...lessonResult,
            title: lesson.title || `Lección ${i + 1}`
          });
        }
      }
    }

    console.log('✅ Todos los assets subidos exitosamente');
    return results;
  } catch (error) {
    console.error('❌ Error subiendo assets:', error);
    throw error;
  }
};

// Función para limpiar archivos no utilizados
export const cleanupUnusedFiles = async (courseId) => {
  try {
    console.log(`🧹 Limpiando archivos no utilizados para curso: ${courseId}`);
    
    // Obtener curso actual
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('thumbnail_url, cover_url, trailer_url, lessons')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Obtener todos los archivos en el bucket
    const { data: allFiles, error: listError } = await supabase.storage
      .from('course-media')
      .list();

    if (listError) throw listError;

    // Filtrar archivos que no están siendo usados
    const usedUrls = [];
    if (course.thumbnail_url) usedUrls.push(course.thumbnail_url);
    if (course.cover_url) usedUrls.push(course.cover_url);
    if (course.trailer_url) usedUrls.push(course.trailer_url);
    
    // Extraer URLs de lecciones
    if (course.lessons && Array.isArray(course.lessons)) {
      course.lessons.forEach(lesson => {
        if (lesson.video_url) usedUrls.push(lesson.video_url);
      });
    }

    // Convertir URLs a paths
    const usedPaths = usedUrls.map(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname.split('/course-media/')[1];
      } catch {
        return null;
      }
    }).filter(path => path);

    // Encontrar archivos no utilizados
    const filesToDelete = allFiles.filter(file => {
      const filePath = file.name;
      return !usedPaths.some(usedPath => usedPath.includes(filePath));
    });

    // Eliminar archivos no utilizados
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Eliminando ${filesToDelete.length} archivos no utilizados...`);
      
      const filePaths = filesToDelete.map(file => file.name);
      const { error: deleteError } = await supabase.storage
        .from('course-media')
        .remove(filePaths);

      if (deleteError) throw deleteError;

      console.log(`✅ ${filesToDelete.length} archivos eliminados`);
    } else {
      console.log('✅ No hay archivos para limpiar');
    }

    return { success: true, deleted: filesToDelete.length };
  } catch (error) {
    console.error('❌ Error limpiando archivos:', error);
    return { success: false, error: error.message };
  }
};