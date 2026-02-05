// src/utils/categoryUtils.js
import { supabase } from './supabase';

export const categoryUtils = {
  // Obtener todas las categorías
  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }
  },

  // Obtener categoría por ID
  async getCategoryById(id) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo categoría:', error);
      return null;
    }
  },

  // Obtener niveles
  async getAllLevels() {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo niveles:', error);
      return [];
    }
  },

  // Formatear nivel para mostrar
  formatLevel(level) {
    const levelMap = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado',
      'principiante': 'Principiante',
      'intermedio': 'Intermedio',
      'avanzado': 'Avanzado'
    };
    return levelMap[level?.toLowerCase()] || level || 'Principiante';
  },

  // Obtener color según categoría
  getCategoryColor(categoryName) {
    const colors = {
      'Electrónica': '#6366F1', // Indigo
      'Tecnología': '#10B981',  // Emerald
    };
    return colors[categoryName] || '#6B7280';
  },

  // Obtener icono según categoría
  getCategoryIcon(categoryName) {
    const icons = {
      'Electrónica': 'chip',
      'Tecnología': 'code-braces',
    };
    return icons[categoryName] || 'book';
  }
};