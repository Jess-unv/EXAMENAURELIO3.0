import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Definición de colores básica
  const theme = {
    isDarkMode,
    colors: {
      primary: '#007AFF', // Tu color principal
      background: isDarkMode ? '#121212' : '#F8F9FA',
      card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#1F2937',
      textSecondary: isDarkMode ? '#A0A0A0' : '#6B7280',
      border: isDarkMode ? '#333333' : '#E5E7EB',
      modalOverlay: 'rgba(0,0,0,0.7)',
    },
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);