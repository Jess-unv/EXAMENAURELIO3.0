// src/components/ProviderBottomNav.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ProviderBottomNav = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mapeo CORREGIDO para coincidir con AppNavigator
  const tabToScreenMap = {
    'dashboard': 'ProviderHome',
    'orders': 'ProviderOrders',
    'products': 'ProviderProducts',
    'profile': 'ProviderProfile'
  };

  // Determinar qué tab está activo basado en la ruta actual
  useEffect(() => {
    const currentRoute = route.name;
    
    // Buscar inversamente: qué tab corresponde a esta ruta
    Object.entries(tabToScreenMap).forEach(([tabId, screenName]) => {
      if (currentRoute === screenName) {
        setActiveTab(tabId);
      }
    });
  }, [route.name]);

  // Función para navegación - SIMPLIFICADA
  const handleTabPress = (tabId) => {
    const screenName = tabToScreenMap[tabId];
    
    if (screenName) {
      setActiveTab(tabId);
      navigation.navigate(screenName);
    }
  };

  // Tabs para proveedor
  const providerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'orders', label: 'Pedidos', icon: 'list-alt' },
    { id: 'products', label: 'Productos', icon: 'inventory' },
    { id: 'profile', label: 'Perfil', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      {providerTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Icon
                name={tab.icon}
                size={26}
                color={isActive ? '#3B82F6' : '#9CA3AF'}
              />
              {/* Indicador visual del tab activo */}
              {isActive && <View style={styles.activeIndicator} />}
            </View>
            <Text style={[
              styles.label, 
              { 
                color: isActive ? '#3B82F6' : '#9CA3AF',
                fontWeight: isActive ? '700' : '500'
              }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: width,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default ProviderBottomNav;