export const COLORS = {
  // Colores principales del proveedor
  primary: "#1E3A8A",     // Azul corporativo
  primaryLight: "#3B82F6",
  secondary: "#10B981",   // Verde esmeralda
  secondaryLight: "#34D399",
  accent: "#8B5CF6",      // Púrpura/violeta
  
  // Colores de estado
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Escala de grises
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#94A3B8",
  mutedForeground: "#64748B",
  foreground: "#0F172A",
  
  // Texto
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#64748B",
  
  // Overlay
  overlay: "rgba(0, 0, 0, 0.4)",
  
  // Degradados
  gradientPrimary: ["#1E3A8A", "#3B82F6"],
  gradientSuccess: ["#10B981", "#34D399"],
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

export const FONT_WEIGHTS = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Tema específico para proveedores
export const PROVIDER_THEME = {
  dashboardCard: {
    background: "#FFFFFF",
    border: "#E2E8F0",
    shadow: SHADOWS.md,
    borderRadius: BORDER_RADIUS.xl,
  },
  statusColors: {
    pending: { bg: "#FEF3C7", text: "#D97706", icon: "#F59E0B" },
    processing: { bg: "#DBEAFE", text: "#1D4ED8", icon: "#3B82F6" },
    shipped: { bg: "#EDE9FE", text: "#7C3AED", icon: "#8B5CF6" },
    delivered: { bg: "#D1FAE5", text: "#059669", icon: "#10B981" },
    cancelled: { bg: "#FEE2E2", text: "#DC2626", icon: "#EF4444" },
  },
  productStatus: {
    active: { bg: "#D1FAE5", text: "#059669" },
    low: { bg: "#FEF3C7", text: "#D97706" },
    out: { bg: "#FEE2E2", text: "#DC2626" },
  },
};