import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, RefreshControl, Image, StatusBar, Dimensions, Animated, Pressable, Modal, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from 'expo-blur';
import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CourseContext";
import { useTheme } from "../context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width, height } = Dimensions.get("window");
const MENU_WIDTH = width * 0.8;

export default function ClientDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { courses, refreshCourses, categories, levels, loading, getCategoryColor, getLevelColor } = useCourses();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [showSortModal, setShowSortModal] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { 
    refreshCourses(); 
  }, []);

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    Animated.timing(filterAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setShowFilters(!showFilters);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCourses();
    setRefreshing(false);
  }, [refreshCourses]);

  const toggleMenu = (open) => {
    if (open) {
      setMenuVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -MENU_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start(() => setMenuVisible(false));
    }
  };

  // --- REPARACIÓN DE FILTROS ---
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses.filter(c => {
      // 1. Lógica de Búsqueda (Texto)
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        (c.title && c.title.toLowerCase().includes(q)) || 
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q));

      // 2. Lógica de Categoría (Normalizamos a minúsculas para comparar)
      const matchCategory = selectedCategory === "all" || 
        (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());

      // 3. Lógica de Nivel
      const matchLevel = selectedLevel === "all" || 
        (c.level && c.level.toLowerCase() === selectedLevel.toLowerCase());

      return matchSearch && matchCategory && matchLevel;
    }).sort((a, b) => {
      // 4. Lógica de Ordenamiento
      if (sortBy === 'price_low') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === 'price_high') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });
  }, [courses, searchQuery, selectedCategory, selectedLevel, sortBy]);

  const renderCourseCard = ({ item: c }) => {
    const catCol = getCategoryColor(c.category);
    const categoryIcon = c.category?.toLowerCase().includes('tec') ? 'laptop' : (c.category_icon || 'school');
    const price = Number(c.price) || 0;
    const discountPrice = c.discount_price != null ? Number(c.discount_price) : null;

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card }]} 
        onPress={() => navigation.navigate("CourseDetail", { courseId: c.id, courseData: c })} 
        activeOpacity={0.9}
      >
        <View style={styles.imgContainer}>
          <Image 
            source={{ uri: c.thumbnail_url || c.cover_url || `https://via.placeholder.com/300x200/${catCol.replace('#','')}?text=${encodeURIComponent(c.title)}` }} 
            style={styles.full} 
            resizeMode="cover" 
          />
          <View style={[styles.badge, { left: 15, width: 30, backgroundColor: getLevelColor(c.level) }]}>
            <Text style={styles.whiteBld}>{c.level?.charAt(0) || 'P'}</Text>
          </View>

          {discountPrice !== null && discountPrice < price && (
            <View style={[styles.badge, { right: 15, backgroundColor: '#EF4444' }]}>
              <Text style={styles.whiteBld}>-{Math.round((1 - discountPrice / price) * 100)}%</Text>
            </View>
          )}

          {price === 0 && (
            <View style={[styles.badge, { right: 15, backgroundColor: '#10B981' }]}>
              <Text style={styles.whiteBld}>GRATIS</Text>
            </View>
          )}
        </View>

        <View style={styles.p15}>
          <View style={styles.rowBetween}>
            <Text style={[styles.titleSmall, { color: colors.text }]} numberOfLines={2}>{c.title}</Text>
            <View style={styles.itemsEnd}>
              {discountPrice !== null && discountPrice < price ? (
                <>
                  <Text style={[styles.price, { color: catCol }]}>${discountPrice.toFixed(2)}</Text>
                  <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>${price.toFixed(2)}</Text>
                </>
              ) : (
                <Text style={[styles.price, { color: catCol }]}>{price > 0 ? `$${price.toFixed(2)}` : 'Gratis'}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {c.subtitle || c.description || 'Sin descripción'}
          </Text>
          <View style={[styles.row, { gap: 15, marginBottom: 15 }]}>
            <Meta icon="clock-outline" text={c.duration_hours ? `${c.duration_hours}h` : 'Flexible'} colors={colors} />
            <Meta icon="school" text={c.level || 'Todos'} colors={colors} />
          </View>
          <View style={styles.rowBetween}>
            <View style={[styles.catBadge, { backgroundColor: catCol + '20', borderColor: catCol }]}>
              <Icon name={categoryIcon} size={14} color={catCol} />
              <Text style={{ fontSize: 12, color: catCol, marginLeft: 4 }}>{c.category || 'General'}</Text>
            </View>
            <Meta icon="account" text={c.adminName || 'Instructor'} colors={colors} size={12} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sortOptions = [
    { id: 'newest', label: 'Más recientes', icon: 'calendar' },
    { id: 'price_low', label: 'Precio: bajo', icon: 'arrow-up' },
    { id: 'price_high', label: 'Precio: alto', icon: 'arrow-down' },
  ];

  const filterHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240]
  });

  if (loading) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.full, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <SafeAreaView style={styles.full}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => toggleMenu(true)}><Icon name="menu" size={28} color={colors.text} /></TouchableOpacity>
          <View style={styles.row}>
            <Text style={[styles.bold20, { color: colors.text }]}>Academy</Text>
            <Text style={[styles.bold20, { color: colors.primary }]}>Pro</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("ClientProfile")}>
            <Image source={{ uri: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'E')}&background=${colors.primary.replace('#','')}&color=fff` }} style={styles.avatarSmall} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.p20} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />} 
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.textSecondary }}>¡Hola, {user?.name?.split(' ')[0]}!</Text>
            <Text style={[styles.titleMain, { color: colors.text }]}>¿Qué aprenderás hoy?</Text>
          </View>

          {/* BUSCADOR */}
          <View style={styles.row}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, flex: 1, marginRight: 10 }]}>
              <Icon name="magnify" size={22} color={colors.textSecondary} />
              <TextInput 
                placeholder="Buscar cursos..." 
                placeholderTextColor={colors.textSecondary} 
                style={[styles.flex1, { color: colors.text, marginLeft: 10 }]} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}><Icon name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.filterToggleBtn, { backgroundColor: showFilters ? colors.primary : colors.card }]} 
              onPress={toggleFilters}
            >
              <Icon name={showFilters ? "filter-variant-remove" : "filter-variant"} size={24} color={showFilters ? "#FFF" : colors.text} />
            </TouchableOpacity>
          </View>

          {/* FILTROS REPARADOS */}
          <Animated.View style={{ height: filterHeight, overflow: 'hidden', opacity: filterAnim }}>
            <View style={[styles.filterContainer, { borderColor: colors.border, marginTop: 15 }]}>
              <FilterSection 
                title="Categorías" 
                data={categories} 
                selected={selectedCategory} 
                onSelect={(name) => setSelectedCategory(name)} 
                colors={colors} 
                getCol={getCategoryColor} 
              />
              <FilterSection 
                title="Nivel" 
                data={levels} 
                selected={selectedLevel} 
                onSelect={(name) => setSelectedLevel(name)} 
                colors={colors} 
                getCol={getLevelColor} 
                isLevel 
              />
            </View>
          </Animated.View>

          <View style={[styles.rowBetween, { marginTop: 15 }]}>
            <TouchableOpacity style={[styles.sortBtn, { backgroundColor: colors.card }]} onPress={() => setShowSortModal(true)}>
              <Icon name="sort" size={18} color={colors.primary} />
              <Text style={{ color: colors.text }}>{sortOptions.find(o => o.id === sortBy)?.label || 'Ordenar'}</Text>
            </TouchableOpacity>
            <View style={[styles.badgeCount, { backgroundColor: isDarkMode ? colors.border : '#F3F4F6' }]}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{filteredCourses.length} cursos</Text>
            </View>
          </View>

          {filteredCourses.length === 0 ? (
            <View style={styles.centerP60}>
              <Icon name="book-search" size={80} color={colors.textSecondary} />
              <Text style={[styles.bold18, { marginTop: 20, color: colors.text }]}>Sin resultados</Text>
              <TouchableOpacity 
                style={styles.resetBtn} 
                onPress={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedLevel("all"); }}
              >
                <Text style={{ color: colors.primary }}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.bold18, { marginVertical: 15, color: colors.text }]}>Cursos Disponibles</Text>
              <FlatList data={filteredCourses} renderItem={renderCourseCard} keyExtractor={item => item.id.toString()} scrollEnabled={false} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* MENU SIDEBAR */}
      {menuVisible && (
        <View style={styles.overlayWrapper}>
          <Animated.View style={[styles.absFill, { opacity: fadeAnim }]}>
            <BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={styles.absFill}>
              <Pressable style={styles.full} onPress={() => toggleMenu(false)} />
            </BlurView>
          </Animated.View>
          <Animated.View style={[styles.sideMenu, { backgroundColor: colors.card, transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.menuHeader}>
              <Image source={{ uri: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'S')}&background=${colors.primary.replace('#','')}&color=fff` }} style={styles.avatarLarge} />
              <Text style={[styles.bold18, { color: colors.text }]}>{user?.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{user?.email}</Text>
            </View>
            <ScrollView style={styles.p20}>
              <MenuItem icon="home" label="Inicio" active colors={colors} onPress={() => toggleMenu(false)} />
              <MenuItem icon="book-open" label="Mis Cursos" colors={colors} onPress={() => { toggleMenu(false); navigation.navigate("ClientEnrollments"); }} />
              <MenuItem icon="account" label="Mi Perfil" colors={colors} onPress={() => { toggleMenu(false); navigation.navigate("ClientProfile"); }} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <Icon name={isDarkMode ? "weather-night" : "weather-sunny"} size={24} color={colors.primary} />
                  <Text style={[styles.pL15, { color: colors.text }]}>Modo {isDarkMode ? 'Oscuro' : 'Claro'}</Text>
                </View>
                <TouchableOpacity onPress={toggleTheme}><Icon name={isDarkMode ? "toggle-switch" : "toggle-switch-off"} size={40} color={isDarkMode ? colors.primary : colors.textSecondary} /></TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.logout, { backgroundColor: '#EF4444' }]} onPress={() => { toggleMenu(false); setTimeout(logout, 300); }}>
              <Icon name="logout" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: 'bold' }}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* MODAL ORDENAR */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.bold18, { marginBottom: 15, color: colors.text }]}>Ordenar por</Text>
            {sortOptions.map(o => (
              <TouchableOpacity key={o.id} style={[styles.modalOpt, sortBy === o.id && { backgroundColor: colors.primary + '20' }]} onPress={() => { setSortBy(o.id); setShowSortModal(false); }}>
                <Icon name={o.icon} size={20} color={sortBy === o.id ? colors.primary : colors.textSecondary} />
                <Text style={[styles.flex1, { marginLeft: 10, color: sortBy === o.id ? colors.primary : colors.text }]}>{o.label}</Text>
                {sortBy === o.id && <Icon name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// COMPONENTES AUXILIARES
const Meta = ({ icon, text, colors, size = 14 }) => (
  <View style={styles.row}>
    <Icon name={icon} size={size} color={colors.textSecondary} />
    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 5 }}>{text}</Text>
  </View>
);

const MenuItem = ({ icon, label, active, colors, onPress }) => (
  <TouchableOpacity style={[styles.menuItem, active && { backgroundColor: colors.primary + '15' }]} onPress={onPress}>
    <Icon name={icon} size={24} color={active ? colors.primary : colors.text} />
    <Text style={[styles.menuItemText, { color: active ? colors.primary : colors.text, fontWeight: active ? '600' : '400' }]}>{label}</Text>
  </TouchableOpacity>
);

const FilterSection = ({ title, data, selected, onSelect, colors, getCol, isLevel }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={[styles.filterTitle, { color: colors.text }]}>{title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <TouchableOpacity 
        style={[styles.chip, { backgroundColor: selected === "all" ? colors.primary : colors.background, borderColor: selected === "all" ? colors.primary : colors.border }]} 
        onPress={() => onSelect("all")}
      >
        <Text style={{ color: selected === "all" ? '#FFF' : colors.text }}>Todos</Text>
      </TouchableOpacity>
      {data?.map(i => {
        const active = selected.toLowerCase() === i.name.toLowerCase();
        const col = getCol(i.name);
        return (
          <TouchableOpacity 
            key={i.id || i.name} 
            style={[styles.chip, { backgroundColor: active ? col : colors.background, borderColor: active ? col : colors.border }]} 
            onPress={() => onSelect(i.name)}
          >
            {!isLevel && <Icon name={i.name?.toLowerCase().includes('tec') ? 'laptop' : (i.icon || 'book')} size={16} color={active ? '#FFF' : col} style={{ marginRight: 5 }} />}
            <Text style={{ color: active ? '#FFF' : colors.text }}>{i.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  full: { flex: 1 },
  flex1: { flex: 1 },
  absFill: StyleSheet.absoluteFillObject,
  overlayWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  p15: { padding: 15 },
  p20: { padding: 20 },
  pL15: { paddingLeft: 15 },
  itemsEnd: { alignItems: 'flex-end' },
  whiteBld: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  bold18: { fontSize: 18, fontWeight: 'bold' },
  bold20: { fontSize: 20, fontWeight: 'bold' },
  card: { borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, marginBottom: 20 },
  imgContainer: { height: 200, position: 'relative' },
  badge: { position: 'absolute', top: 15, padding: 5, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  titleSmall: { flex: 1, fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  price: { fontSize: 18, fontWeight: 'bold' },
  oldPrice: { fontSize: 14, textDecorationLine: 'line-through' },
  desc: { fontSize: 14, marginBottom: 15 },
  catBadge: { flexDirection: 'row', padding: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, gap: 5, alignItems: 'center' },
  sideMenu: { width: MENU_WIDTH, height: height, paddingTop: 60, zIndex: 1001, elevation: 10 },
  menuHeader: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, marginBottom: 15 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 5 },
  menuItemText: { marginLeft: 15, fontSize: 16 },
  divider: { height: 1, marginVertical: 20 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, margin: 20, borderRadius: 12, gap: 10, position: 'absolute', bottom: 40, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20 },
  titleMain: { fontSize: 28, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, height: 50 },
  filterToggleBtn: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { padding: 10, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed' },
  sortBtn: { flexDirection: 'row', padding: 10, paddingHorizontal: 15, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  badgeCount: { padding: 6, paddingHorizontal: 12, borderRadius: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  filterTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalOpt: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10 },
  centerP60: { alignItems: 'center', paddingVertical: 60 },
  resetBtn: { marginTop: 20, padding: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' }
});