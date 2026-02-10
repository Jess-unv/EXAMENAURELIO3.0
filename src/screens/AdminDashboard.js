import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
  Easing,
  ActivityIndicator,
  Switch,
  Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CourseContext";
import { useTheme } from "../context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../utils/supabase";

const { width } = Dimensions.get("window");

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { myCourses, adminLoading: loading, refreshCourses } = useCourses();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalEnrollments: 0,
    paidEnrollments: 0,
    freeEnrollments: 0,
    loading: true,
  });

  const bgAnim1 = useRef(new Animated.Value(0)).current;
  const bgAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = (anim, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };
    float(bgAnim1, 5000);
    float(bgAnim2, 8000);

    if (user?.id) {
      loadDashboardStats();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channelCourses = supabase
      .channel(`admin-courses-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `admin_id=eq.${user.id}`,
        },
        () => loadDashboardStats(),
      )
      .subscribe();

    const channelEnrollments = supabase
      .channel(`admin-enrollments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
          filter: `course_id=in.(select id from courses where admin_id=eq.${user.id})`,
        },
        () => loadDashboardStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelCourses);
      supabase.removeChannel(channelEnrollments);
    };
  }, [user?.id]);

  const toggleMenu = (show) => {
    if (show) {
      setMenuVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 5,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: -300, useNativeDriver: true }),
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMenuVisible(false));
    }
  };

  const loadDashboardStats = async () => {
    try {
      setDashboardStats((prev) => ({ ...prev, loading: true }));
      if (!user?.id) {
        setDashboardStats({
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalEnrollments: 0,
          paidEnrollments: 0,
          freeEnrollments: 0,
          loading: false,
        });
        return;
      }

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, is_published")
        .eq("admin_id", user.id);

      if (coursesError) throw coursesError;

      const totalCourses = coursesData?.length || 0;
      const publishedCourses =
        coursesData?.filter((c) => c.is_published).length || 0;
      const draftCourses = totalCourses - publishedCourses;

      const { data: enrollmentsData, error: enrollError } = await supabase
        .from("enrollments")
        .select("id, price_paid")
        .in("course_id", coursesData?.map((c) => c.id) || []);

      if (enrollError) throw enrollError;

      const totalEnrollments = enrollmentsData?.length || 0;
      const paidEnrollments =
        enrollmentsData?.filter((e) => e.price_paid > 0).length || 0;
      const freeEnrollments = totalEnrollments - paidEnrollments;

      setDashboardStats({
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        paidEnrollments,
        freeEnrollments,
        loading: false,
      });
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      setDashboardStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCourses(), loadDashboardStats()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
          toggleMenu(false);
        },
      },
    ]);
  };

  const formatNumber = (num) => num.toLocaleString("es-MX");

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Animación de fondo */}
      <Animated.View
        style={[
          styles.bgCircle,
          {
            transform: [
              {
                translateY: bgAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 50],
                }),
              },
            ],
            top: 50,
            left: -40,
            backgroundColor: colors.primary,
            opacity: isDarkMode ? 0.08 : 0.12,
          },
        ]}
      />

      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.card,
            shadowColor: isDarkMode ? "#000" : "#64748b",
          },
        ]}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => toggleMenu(true)}
              style={styles.menuBtn}
            >
              <Icon name="menu" size={32} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.textContainer}>
              <Text style={[styles.greet, { color: colors.textSecondary }]}>
                Panel de Administración
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.name || "Administrador"}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Tarjeta principal */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderLeftColor: colors.primary },
          ]}
        >
          <View style={styles.statsHeaderRow}>
            <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>
              Resumen de tu plataforma
            </Text>
            {dashboardStats.loading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          {!dashboardStats.loading && (
            <View style={styles.statsValueRow}>
              <View>
                <Text style={[styles.bigAmount, { color: colors.text }]}>
                  {formatNumber(dashboardStats.totalCourses)}
                </Text>
                <Text
                  style={[
                    styles.statsSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cursos totales
                </Text>
              </View>
              <Icon
                name="book-education-outline"
                size={40}
                color={colors.primary}
                opacity={0.2}
              />
            </View>
          )}
        </View>

        {/* Acciones rápidas */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Acciones rápidas
        </Text>
        <View style={styles.row}>
          <ActionButton
            icon="plus-box"
            label="Nuevo Curso"
            color="#10b981"
            bg="#ecfdf5"
            darkBg="#064e3b"
            onPress={() => navigation.navigate("AddCourse")}
            themeColors={colors}
          />
        </View>

        {/* Cursos Recientes */}
        <View style={styles.productsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tus cursos ({myCourses.length})
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminCourses")}
            style={styles.viewAllButton}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              Ver todos
            </Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : myCourses.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Icon
              name="book-education-outline"
              size={50}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No tienes cursos aún
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyStateButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigation.navigate("AddCourse")}
            >
              <Text style={styles.emptyStateButtonText}>
                Crear primer curso
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {myCourses.slice(0, 4).map((item) => (
              <CourseItem
                key={item.id}
                item={item}
                themeColors={colors}
                onEdit={() =>
                  navigation.navigate("EditCourse", { courseId: item.id })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Drawer lateral (Menu completo agregado) */}
      {menuVisible && (
        <>
          <Animated.View style={[styles.overlay, { opacity: menuOpacity }]}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => toggleMenu(false)}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: slideAnim }],
                backgroundColor: colors.card,
              },
            ]}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View
                style={[
                  styles.drawerHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[styles.dAvatar, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.dAvatarTxt}>{user?.name?.charAt(0)}</Text>
                </View>
                <Text style={[styles.dName, { color: colors.text }]}>
                  {user?.name}
                </Text>
                <Text style={[styles.dEmail, { color: colors.textSecondary }]}>
                  {user?.email}
                </Text>
              </View>

              <View style={styles.dContent}>
                {/* ENLACES COMPLETOS DEL APPNAVIGATOR */}
                <DrawerLink
                  icon="view-dashboard"
                  label="Dashboard"
                  onPress={() => toggleMenu(false)}
                  themeColors={colors}
                />
                <DrawerLink
                  icon="book-multiple"
                  label="Mis Cursos"
                  onPress={() => {
                    toggleMenu(false);
                    navigation.navigate("AdminCourses");
                  }}
                  themeColors={colors}
                />
               
                <DrawerLink
                  icon="account-circle"
                  label="Mi Perfil"
                  onPress={() => {
                    toggleMenu(false);
                    navigation.navigate("AdminProfile");
                  }}
                  themeColors={colors}
                />

                <View style={styles.themeSwitchRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 15,
                    }}
                  >
                    <Icon
                      name={isDarkMode ? "weather-night" : "weather-sunny"}
                      size={26}
                      color={colors.primary}
                    />
                    <Text style={[styles.dLinkText, { color: colors.text }]}>
                      Modo Oscuro
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleTheme}
                    trackColor={{ false: "#cbd5e1", true: colors.primary }}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.logout,
                  { backgroundColor: isDarkMode ? "#451a1a" : "#fff1f2" },
                ]}
                onPress={handleLogout}
              >
                <Icon name="logout" size={22} color="#ef4444" />
                <Text style={styles.logoutTxt}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// COMPONENTES AUXILIARES (Sin cambios)
const StatCard = ({ icon, value, label, color, themeColors }) => (
  <View style={[styles.miniStatCard, { backgroundColor: themeColors.card }]}>
    <Icon name={icon} size={28} color={color} />
    <Text style={[styles.miniStatValue, { color: themeColors.text }]}>
      {value}
    </Text>
    <Text style={[styles.miniStatLabel, { color: themeColors.textSecondary }]}>
      {label}
    </Text>
  </View>
);

const ActionButton = ({
  icon,
  label,
  color,
  bg,
  darkBg,
  onPress,
  themeColors,
}) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      { backgroundColor: themeColors.card, borderColor: color },
    ]}
    onPress={onPress}
  >
    <View
      style={[
        styles.iconBox,
        { backgroundColor: themeColors.isDarkMode ? darkBg : bg },
      ]}
    >
      <Icon name={icon} size={32} color={color} />
    </View>
    <Text style={[styles.actionLabel, { color: themeColors.text }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const CourseItem = ({ item, themeColors, onEdit }) => (
  <View style={[styles.itemCard, { backgroundColor: themeColors.card }]}>
    <View
      style={[
        styles.imgWrap,
        { backgroundColor: themeColors.isDarkMode ? "#2d2d2d" : "#f1f5f9" },
      ]}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.img} />
      ) : (
        <Icon name="book" size={24} color="#ccc" />
      )}
      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: themeColors.primary }]}
        onPress={onEdit}
      >
        <Icon name="pencil" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
    <Text
      style={[styles.itemName, { color: themeColors.text }]}
      numberOfLines={1}
    >
      {item.title}
    </Text>
    <Text style={styles.itemPrice}>
      {item.price > 0 ? `$${parseFloat(item.price).toFixed(2)}` : "Gratis"}
    </Text>
  </View>
);

const DrawerLink = ({ icon, label, onPress, themeColors }) => (
  <TouchableOpacity style={styles.dLink} onPress={onPress}>
    <Icon name={icon} size={26} color={themeColors.primary} />
    <Text style={[styles.dLinkText, { color: themeColors.text }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  bgCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  headerContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    paddingBottom: 15,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 35 : 10,
  },
  menuBtn: { padding: 5 },
  textContainer: { flex: 1, marginLeft: 15 },
  greet: { fontSize: 12, fontWeight: "600" },
  userName: { fontSize: 20, fontWeight: "900" },
  scroll: { padding: 20, paddingBottom: 40 },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  statsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statsTitle: { fontSize: 14, fontWeight: "600" },
  statsValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigAmount: { fontSize: 28, fontWeight: "900" },
  statsSubtitle: { fontSize: 12, marginTop: 4 },
  miniStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 1,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
  },
  miniStatLabel: { fontSize: 11, marginTop: 4, textAlign: "center" },
  additionalStats: { flexDirection: "row", gap: 10, marginBottom: 20 },
  additionalStatCard: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    gap: 12,
  },
  additionalStatInfo: { flex: 1 },
  additionalStatValue: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  additionalStatLabel: { fontSize: 12 },
  row: { flexDirection: "row", gap: 15, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    elevation: 1,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: { fontWeight: "700", fontSize: 12, textAlign: "center" },
  productsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  viewAllButton: { paddingVertical: 4, paddingHorizontal: 8 },
  viewAllText: { fontSize: 13, fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemCard: {
    width: (width - 55) / 2,
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    elevation: 1,
  },
  imgWrap: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },
  img: { width: "100%", height: "100%" },
  editBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 5,
    borderRadius: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    height: 36,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 2,
    color: "#10b981",
  },
  emptyState: {
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
    elevation: 1,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 1000,
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 1001,
    padding: 25,
  },
  drawerHeader: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
    alignItems: "center",
  },
  dAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  dAvatarTxt: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  dName: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  dEmail: { fontSize: 13, textAlign: "center", marginBottom: 10 },
  dContent: { flex: 1 },
  dLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 15,
  },
  themeSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  dLinkText: { fontSize: 16, fontWeight: "700" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },
  logoutTxt: { color: "#ef4444", fontWeight: "800" },
});
