// src/utils/mediaUtils.js
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
    } else if (['jpg', 'jpeg'].includes(fileExt)) {
      contentType = 'image/jpeg';
      folderPath = `images/${folder}`;
    } else if (fileExt === 'png') {
      contentType = 'image/png';
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
    const allowedExtensions = ['mp4', 'mov', 'avi', 'mkv'];
    
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

export const getFileExtension = (uri) => {
  return uri.split('.').pop().toLowerCase();
};

export const isImageFile = (uri) => {
  const ext = getFileExtension(uri);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

export const isVideoFile = (uri) => {
  const ext = getFileExtension(uri);
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
};

// Función para comprimir imagen antes de subir
export const compressImage = async (imageUri, quality = 0.8) => {
  try {
    // En una app real, usarías una librería de compresión
    // Por ahora devolvemos la misma URI
    return imageUri;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    return imageUri;
  }
};