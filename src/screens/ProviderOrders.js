import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, StatusBar, SafeAreaView, Animated, Dimensions, ScrollView,
  ActivityIndicator, Platform, Easing, TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabase';

const { width, height } = Dimensions.get('window');

// Colores de estado mejorados con mejor contraste
const getStatusColors = (isDarkMode) => ({
  pending: { 
    bg: isDarkMode ? '#451a03' : '#FEF3C7', 
    color: '#F59E0B', 
    label: 'Pendiente', 
    icon: 'clock-outline',
    gradient: isDarkMode ? ['#451a03', '#7c2d12'] : ['#FEF3C7', '#FDE68A']
  },
  paid: { 
    bg: isDarkMode ? '#064e3b' : '#D1FAE5', 
    color: '#10B981', 
    label: 'Pagado', 
    icon: 'cash-check',
    gradient: isDarkMode ? ['#064e3b', '#047857'] : ['#D1FAE5', '#A7F3D0']
  },
  processing: { 
    bg: isDarkMode ? '#1e3a8a' : '#DBEAFE', 
    color: '#60A5FA', 
    label: 'En proceso', 
    icon: 'cog-sync',
    gradient: isDarkMode ? ['#1e3a8a', '#1e40af'] : ['#DBEAFE', '#93C5FD']
  },
  shipped: { 
    bg: isDarkMode ? '#4c1d95' : '#EDE9FE', 
    color: '#A78BFA', 
    label: 'Enviado', 
    icon: 'truck-delivery',
    gradient: isDarkMode ? ['#4c1d95', '#5b21b6'] : ['#EDE9FE', '#DDD6FE']
  },
  delivered: { 
    bg: isDarkMode ? '#064e3b' : '#DCFCE7', 
    color: '#10B981', 
    label: 'Entregado', 
    icon: 'check-circle',
    gradient: isDarkMode ? ['#064e3b', '#065f46'] : ['#DCFCE7', '#86EFAC']
  },
  cancelled: { 
    bg: isDarkMode ? '#450a0a' : '#FEE2E2', 
    color: '#EF4444', 
    label: 'Cancelado', 
    icon: 'close-circle',
    gradient: isDarkMode ? ['#450a0a', '#7f1d1d'] : ['#FEE2E2', '#FCA5A5']
  },
});

const statusFilters = [
  { id: 'all', label: 'Todos', icon: 'all-inclusive', color: '#6B7280' },
  { id: 'pending', label: 'Pendientes', icon: 'clock-alert-outline', color: '#F59E0B' },
  { id: 'processing', label: 'En proceso', icon: 'cached', color: '#60A5FA' },
  { id: 'shipped', label: 'Enviados', icon: 'truck-fast', color: '#A78BFA' },
  { id: 'delivered', label: 'Entregados', icon: 'check-all', color: '#10B981' },
  { id: 'cancelled', label: 'Cancelados', icon: 'close-circle', color: '#EF4444' },
];

export default function ProviderOrders({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    revenue: 0, 
    average: 0,
    delivered: 0,
    processing: 0
  });

  const statusColors = getStatusColors(isDarkMode);
  const bgAnim1 = useRef(new Animated.Value(0)).current;
  const bgAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) loadOrders();
    
    // Animaciones de fondo
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim1, { 
          toValue: 1, 
          duration: 8000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
        Animated.timing(bgAnim1, { 
          toValue: 0, 
          duration: 8000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim2, { 
          toValue: 1, 
          duration: 10000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
        Animated.timing(bgAnim2, { 
          toValue: 0, 
          duration: 10000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
      ])
    ).start();

    // Animación de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`*, order_items (*, products (*)), clients:client_id (*)`)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = ordersData.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        clientName: order.clients?.name || 'Cliente',
        clientEmail: order.clients?.email || '',
        total: parseFloat(order.total),
        status: order.status,
        createdAt: order.created_at,
        paymentMethod: order.payment_method || 'Tarjeta',
        items: order.order_items?.map(item => ({
          productName: item.products?.name || 'Producto',
          quantity: item.quantity,
          price: item.products?.price || 0,
        })) || [],
      }));

      setOrders(formattedOrders);
      filterOrders(selectedFilter, formattedOrders);
      calculateStats(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (list) => {
    const deliveredOrders = list.filter(o => o.status === 'delivered');
    const revenue = deliveredOrders.reduce((s, o) => s + o.total, 0);
    const pending = list.filter(o => o.status === 'pending').length;
    const processing = list.filter(o => o.status === 'processing').length;
    const delivered = deliveredOrders.length;
    
    setStats({
      total: list.length,
      pending,
      processing,
      delivered,
      revenue,
      average: deliveredOrders.length > 0 ? revenue / deliveredOrders.length : 0
    });
  };

  const filterOrders = (filterId, list = orders) => {
    setSelectedFilter(filterId);
    let filtered = list;
    
    if (filterId !== 'all') {
      filtered = list.filter(o => o.status === filterId);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredOrders(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterOrders(selectedFilter);
  };

  const handleStatusChange = async (id, newStatus) => {
    Alert.alert(
      "Actualizar estado",
      `¿Confirmar cambio a "${statusColors[newStatus]?.label || newStatus}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: async () => {
            try {
              // Aquí puedes agregar la actualización en Supabase si es necesario
              // const { error } = await supabase
              //   .from('orders')
              //   .update({ status: newStatus })
              //   .eq('id', id);
              
              // if (error) throw error;
              
              const updated = orders.map(o => 
                o.id === id ? { ...o, status: newStatus } : o
              );
              
              setOrders(updated);
              filterOrders(selectedFilter, updated);
              
              Alert.alert("✅ Éxito", "Estado actualizado correctamente");
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert("❌ Error", "No se pudo actualizar el estado");
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const renderOrderItem = ({ item, index }) => {
    const status = statusColors[item.status] || statusColors.pending;
    
    return (
      <Animated.View 
        style={[
          styles.orderCard, 
          { 
            backgroundColor: colors.card,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50 * (index + 1), 0]
              })
            }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <View style={styles.orderNumberRow}>
              <Icon name="tag-outline" size={16} color={colors.primary} />
              <Text style={[styles.orderNum, { color: colors.text }]}>
                #{item.orderNumber}
              </Text>
            </View>
            <View style={styles.timeInfo}>
              <Icon name="calendar-clock" size={14} color={colors.textSecondary} />
              <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Icon name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusTxt, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.clientSection}>
          <View style={[styles.clientAvatar, { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff' }]}>
            <Icon name="account-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: colors.text }]}>
              {item.clientName}
            </Text>
            <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>
              {item.clientEmail}
            </Text>
          </View>
        </View>

        <View style={[styles.itemsSection, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsTitle, { color: colors.text }]}>
              Productos ({item.items.length})
            </Text>
            <Icon name="package-variant" size={18} color={colors.textSecondary} />
          </View>
          
          {item.items.slice(0, 2).map((prod, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>
                {prod.productName}
              </Text>
              <Text style={[styles.itemDetails, { color: colors.text }]}>
                {prod.quantity} × {formatCurrency(prod.price)}
              </Text>
            </View>
          ))}
          
          {item.items.length > 2 && (
            <Text style={[styles.moreItems, { color: colors.primary }]}>
              +{item.items.length - 2} más
            </Text>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
          <View style={styles.totalSection}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Total
            </Text>
            <Text style={[styles.totalVal, { color: '#10B981' }]}>
              {formatCurrency(item.total)}
            </Text>
          </View>
          
          <View style={styles.actionsRow}>
            {item.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
                onPress={() => handleStatusChange(item.id, 'processing')}
              >
                <Icon name="check-bold" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Aceptar</Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'processing' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.primary }]} 
                onPress={() => handleStatusChange(item.id, 'shipped')}
              >
                <Icon name="truck-fast" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Enviar</Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'shipped' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
                onPress={() => handleStatusChange(item.id, 'delivered')}
              >
                <Icon name="check-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Completar</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.detailsBtn, { borderColor: colors.border }]} 
              onPress={() => navigation.navigate('OrderDetail', { order: item })}
            >
              <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                Detalles
              </Text>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilterChip = ({ item }) => {
    const isSelected = selectedFilter === item.id;
    const filterColor = isSelected ? item.color : colors.textSecondary;
    
    return (
      <TouchableOpacity 
        onPress={() => filterOrders(item.id)}
        style={[
          styles.filterChip, 
          { 
            backgroundColor: isSelected ? item.color : 'transparent',
            borderColor: isSelected ? item.color : colors.border
          }
        ]}
      >
        <Icon 
          name={item.icon} 
          size={16} 
          color={isSelected ? '#fff' : filterColor} 
        />
        <Text style={[
          styles.filterChipText, 
          { color: isSelected ? '#fff' : colors.textSecondary }
        ]}>
          {item.label}
        </Text>
        
        {isSelected && item.id !== 'all' && (
          <View style={[styles.filterCount, { backgroundColor: '#fff' }]}>
            <Text style={[styles.filterCountText, { color: item.color }]}>
              {filteredOrders.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Fondos animados */}
      <Animated.View style={[styles.bgCircle, { 
        transform: [{ 
          translateY: bgAnim1.interpolate({ 
            inputRange: [0, 1], 
            outputRange: [0, 60] 
          }) 
        }],
        backgroundColor: colors.primary, 
        opacity: isDarkMode ? 0.05 : 0.08,
        top: -100, 
        right: -100 
      }]} />
      
      <Animated.View style={[styles.bgCircle, { 
        transform: [{ 
          translateY: bgAnim2.interpolate({ 
            inputRange: [0, 1], 
            outputRange: [40, -20] 
          }) 
        }],
        backgroundColor: colors.primary, 
        opacity: isDarkMode ? 0.03 : 0.05,
        bottom: -50, 
        left: -80,
        width: 200,
        height: 200
      }]} />

      {/* Header mejorado */}
      <View style={[styles.headerContainer, { 
        backgroundColor: colors.card,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30
      }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.backBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            >
              <Icon name="chevron-left" size={28} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Mis Pedidos
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {stats.total} pedidos • {formatCurrency(stats.revenue)} ingresos
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.refreshBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={loadOrders}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="refresh" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Búsqueda */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                color: colors.text
              }]}
              placeholder="Buscar pedido o cliente..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Icon name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Estadísticas rápidas */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.statsContainer}
          >
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#e2e8f0' }]}>
                <Icon name="package-variant" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#451a03' : '#FEF3C7' }]}>
                <Icon name="clock-alert-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendientes</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#064e3b' : '#D1FAE5' }]}>
                <Icon name="cash-multiple" size={20} color="#10B981" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{formatCurrency(stats.revenue)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ingresos</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: isDarkMode ? '#1e3a8a' : '#DBEAFE' }]}>
                <Icon name="chart-line" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{formatCurrency(stats.average)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ticket prom.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Filtros mejorados */}
      <View style={styles.filterContainer}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>
          Filtrar por estado
        </Text>
        <FlatList
          data={statusFilters}
          renderItem={renderFilterChip}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Lista de pedidos */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando pedidos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContainer,
            filteredOrders.length === 0 && styles.emptyListContainer
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={loadOrders} 
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <Icon 
                  name={selectedFilter === 'all' ? "package-variant" : statusFilters.find(f => f.id === selectedFilter)?.icon || "package-variant"} 
                  size={60} 
                  color={isDarkMode ? '#334155' : '#cbd5e1'} 
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No hay pedidos {selectedFilter !== 'all' ? `en "${statusFilters.find(f => f.id === selectedFilter)?.label}"` : ''}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery ? 'Prueba con otra búsqueda' : 'Los nuevos pedidos aparecerán aquí'}
              </Text>
              {searchQuery && (
                <TouchableOpacity 
                  style={[styles.clearSearchBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleSearch('')}
                >
                  <Text style={styles.clearSearchText}>Limpiar búsqueda</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { 
    flex: 1,
  },
  bgCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  headerContainer: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 10,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 42,
    fontSize: 15,
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 20,
  },
  statCard: {
    width: 110,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  filterList: {
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1.5,
    minWidth: 100,
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  filterCount: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  orderCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNum: {
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 6,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 13,
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statusTxt: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 12,
    opacity: 0.8,
  },
  itemsSection: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  itemDetails: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreItems: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  clearSearchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});