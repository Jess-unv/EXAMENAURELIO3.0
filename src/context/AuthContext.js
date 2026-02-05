// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario desde AsyncStorage al iniciar (opcional, para carga rápida)
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.role === "admin" || parsed?.role === "client") {
            setUser(parsed);
          }
        }
      } catch (err) {
        // Silencioso, no mostramos error aquí
      }
    };
    loadStoredUser();
  }, []);

  const fetchUserProfile = async (authUserId) => {
    try {
      if (!authUserId) {
        setUser(null);
        return null;
      }

      let { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUserId)
        .maybeSingle();

      if (error) {
        // Fallback por si el auth_id no está vinculado
        const { data: profileById } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUserId)
          .maybeSingle();
        profile = profileById;
      }

      if (!profile) {
        const { data: authUser } = await supabase.auth.getUser();

        if (authUser?.user) {
          const newUserData = {
            auth_id: authUser.user.id,
            email: authUser.user.email,
            name:
              authUser.user.user_metadata?.name ||
              authUser.user.email?.split("@")[0] ||
              "Usuario",
            role: authUser.user.user_metadata?.role || "client",
          };

          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert([newUserData])
            .select()
            .single();

          if (createError) throw createError;

          if (newProfile) {
            setUser(newProfile);
            await AsyncStorage.setItem("user", JSON.stringify(newProfile));
            return newProfile;
          }
        }
      } else {
        // Asegurar que tenga auth_id vinculado
        if (!profile.auth_id) {
          await supabase
            .from("users")
            .update({ auth_id: authUserId })
            .eq("id", profile.id);
        }

        setUser(profile);
        await AsyncStorage.setItem("user", JSON.stringify(profile));
        return profile;
      }

      return null;
    } catch (error) {
      // No mostramos error en consola aquí para no ensuciar
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Silencioso, el AuthScreen manejará los errores visibles
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await fetchUserProfile(newSession.user.id);
      } else {
        setUser(null);
        await AsyncStorage.removeItem("user");
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, name, role = "client") => {
    try {
      setLoading(true);

      if (!["client", "admin"].includes(role)) {
        throw new Error("Rol no permitido. Solo 'client' o 'admin'");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            role: role,
          },
        },
      });

      if (authError) {
        let errorMessage = "Error en el registro";
        if (authError.message.includes("User already registered")) {
          errorMessage = "Este email ya está registrado";
        } else if (authError.message.includes("Password")) {
          errorMessage = "La contraseña debe tener al menos 6 caracteres";
        } else {
          errorMessage = authError.message;
        }
        throw new Error(errorMessage);
      }

      if (!authData.user?.confirmed_at) {
        return {
          success: true,
          message: "Registro exitoso! Por favor verifica tu email.",
          needsEmailVerification: true,
        };
      }

      // Crear en tabla users
      const newUserData = {
        auth_id: authData.user.id,
        email: email,
        name: name.trim(),
        role: role,
      };

      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([newUserData])
        .select()
        .single();

      if (userError) throw userError;

      setUser(userData);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      return {
        success: true,
        message: "Registro completado exitosamente!",
        user: userData,
      };
    } catch (error) {
      // No console.error aquí, lo manejamos en la pantalla
      return {
        success: false,
        error: error.message || "Error en el registro",
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = "Credenciales incorrectas";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Email o contraseña incorrectos";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Por favor confirma tu email antes de iniciar sesión";
        } else if (error.message.includes("User not found")) {
          errorMessage = "No existe una cuenta con este email";
        } else {
          errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }

      const profile = await fetchUserProfile(data.user.id);

      if (!profile) {
        const basicUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0],
          role: data.user.user_metadata?.role || "client",
        };
        setUser(basicUser);
        await AsyncStorage.setItem("user", JSON.stringify(basicUser));
      }

      return {
        success: true,
        message: "Inicio de sesión exitoso!",
      };
    } catch (error) {
      // No console.error aquí, lo manejamos en la pantalla
      return {
        success: false,
        error: error.message || "Error en el inicio de sesión",
      };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user?.id) throw new Error("No hay usuario autenticado");

      const { data, error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      return {
        success: true,
        user: updatedUser,
        message: "Perfil actualizado correctamente",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Error al actualizar el perfil",
      };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      await supabase.auth.signOut();

      setUser(null);
      setSession(null);
      await AsyncStorage.removeItem("user");

      return {
        success: true,
        message: "Sesión cerrada correctamente",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Error al cerrar sesión",
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    logout,
    updateProfile,
    isAuthenticated: !!user && !!session,
    userRole: user?.role || "guest",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};