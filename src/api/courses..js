import { supabase } from '../utils/supabase';

export const coursesAPI = {
  async getAllPublishedCourses() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          admin:users(name, email),
          category:categories(name, description),
          level:levels(name)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error en getAllPublishedCourses:', error);
      throw error;
    }
  },

  async getCoursesByCategory(categoryId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          admin:users(name),
          category:categories(name),
          level:levels(name)
        `)
        .eq('category_id', categoryId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error en getCoursesByCategory:', error);
      throw error;
    }
  },

  async getCoursesByLevel(levelId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          admin:users(name),
          category:categories(name),
          level:levels(name)
        `)
        .eq('level_id', levelId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error en getCoursesByLevel:', error);
      throw error;
    }
  },

  async getAdminCourses(adminId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          admin:users(name, email),
          category:categories(name, description),
          level:levels(name)
        `)
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error en getAdminCourses:', error);
      throw error;
    }
  },

  async getCourseById(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          admin:users(name, email),
          category:categories(name, description),
          level:levels(name)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en getCourseById:', error);
      throw error;
    }
  },

  async createCourse(courseData) {
    try {
      const dataToInsert = {
        ...courseData,
        video_url: courseData.video_url || courseData.trailer_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([dataToInsert])
        .select(`
          *,
          admin:users(name),
          category:categories(name),
          level:levels(name)
        `)
        .single();

      if (error) throw error;
      return { success: true, course: data };
    } catch (error) {
      console.error('Error en createCourse:', error);
      return { success: false, error: error.message };
    }
  },

  async updateCourse(courseId, updates) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .select(`
          *,
          admin:users(name),
          category:categories(name),
          level:levels(name)
        `)
        .single();

      if (error) throw error;
      return { success: true, course: data };
    } catch (error) {
      console.error('Error en updateCourse:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteCourse(courseId) {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error en deleteCourse:', error);
      return { success: false, error: error.message };
    }
  },

  async togglePublish(courseId, publish = true) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, course: data };
    } catch (error) {
      console.error('Error en togglePublish:', error);
      return { success: false, error: error.message };
    }
  }
};