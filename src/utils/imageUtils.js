import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export const uploadImageToSupabase = async (imageUri, productId, imageIndex) => {
  try {
    // Leer la imagen como base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Generar nombre único para la imagen
    const fileName = `product_${productId}_${Date.now()}_${imageIndex}.jpg`;
    const filePath = `product-images/${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error subiendo imagen:', error);
      return null;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error procesando imagen:', error);
    return null;
  }
};

export const deleteImageFromSupabase = async (imageUrl) => {
  try {
    // Extraer el nombre del archivo de la URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `product-images/${fileName}`;

    const { error } = await supabase.storage
      .from('products')
      .remove([filePath]);

    if (error) {
      console.error('Error eliminando imagen:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return false;
  }
};

// Función para manejar imágenes (usada en el ProductContext si decides procesar imágenes)
export const processImages = async (images, productId) => {
  const imageUrls = [];
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    // Si ya es una URL, mantenerla
    if (image.startsWith('http')) {
      imageUrls.push(image);
    } else {
      // Es una nueva imagen, subirla
      const imageUrl = await uploadImageToSupabase(image, productId, i);
      if (imageUrl) {
        imageUrls.push(imageUrl);
      }
    }
  }
  
  return imageUrls;
};