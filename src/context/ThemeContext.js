import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Paleta de colores mejorada para Light Mode (aliases incluidos)
  const lightColors = {
    primary: "#1E3A8A",
    primaryLight: "#3B82F6",
    secondary: "#10B981",
    accent: "#8B5CF6",
    background: "#F8FAFC",
    card: "#FFFFFF",
    // text / foreground
    text: "#0F172A",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#64748B",
    foreground: "#0F172A",
    // contrast on primary/background
    primaryForeground: "#FFFFFF",
    // muted
    muted: "#F1F5F9",
    mutedForeground: "#64748B",
    // borders
    border: "#E2E8F0",
    borderLight: "#F3F4F6",
    // semantic
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    info: "#3B82F6",
    modalOverlay: "rgba(0,0,0,0.5)",
    switchTrack: "#D1D5DB",
    switchThumb: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.4)",
  };

  // Paleta de colores mejorada para Dark Mode (aliases incluidos)
  const darkColors = {
    primary: "#3B82F6",
    primaryLight: "#60A5FA",
    secondary: "#34D399",
    accent: "#A78BFA",
    background: "#0F172A",
    card: "#111827",
    // text / foreground
    text: "#E6EEF8",
    textPrimary: "#E6EEF8",
    textSecondary: "#CBD5E1",
    textTertiary: "#94A3B8",
    foreground: "#E6EEF8",
    // contrast on primary/background
    primaryForeground: "#0F172A",
    // muted
    muted: "#0B1220",
    mutedForeground: "#94A3B8",
    // borders
    border: "#24303F",
    borderLight: "#334155",
    // semantic
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    destructive: "#F87171",
    destructiveForeground: "#0F172A",
    info: "#60A5FA",
    modalOverlay: "rgba(0,0,0,0.8)",
    switchTrack: "#475569",
    switchThumb: "#F1F5F9",
    overlay: "rgba(0, 0, 0, 0.6)",
  };

  const colors = isDarkMode ? darkColors : lightColors;

  const theme = {
    isDarkMode,
    colors: {
      ...colors,
      toggleTheme,
    },
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
