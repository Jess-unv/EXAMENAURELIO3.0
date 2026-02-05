// utils/supabase.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Configuración de Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Configuración Supabase:', {
  url: supabaseUrl ? '✅ Configurada' : '❌ Faltante',
  key: supabaseAnonKey ? `✅ (${supabaseAnonKey.length} chars)` : '❌ Faltante'
});

// Crear cliente con configuración optimizada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    fetch: (url, options = {}) => {
      // Agregar timeout para evitar problemas de red
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    }
  }
});

// Exportar URL para uso en otros lugares
export { supabaseUrl };