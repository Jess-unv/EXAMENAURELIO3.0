// src/components/BottomNav.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const BottomNav = ({ activeTab }) => {
  const navigation = useNavigation();
  const route = useRoute();

  // Mapeo CORREGIDO para coincidir con AppNavigator
  const tabToScreenMap = {
    'Home': 'ClientHome',
    'Orders': 'ClientOrders', 
    'Cart': 'ClientCart',
    'Profile': 'ClientProfile'
  };

  const tabs = [
    { id: 'Home', label: 'Inicio', icon: 'home' },
    { id: 'Orders', label: 'Pedidos', icon: 'shopping-bag' },
    { id: 'Cart', label: 'Carrito', icon: 'shopping-cart' },
    { id: 'Profile', label: 'Perfil', icon: 'person' },
  ];

  // Función para manejar la navegación CORREGIDA
  const handleNavigation = (tabId) => {
    const screenName = tabToScreenMap[tabId];
    if (screenName) {
      navigation.navigate(screenName);
    } else {
      console.warn(`No se encontró mapeo para el tab: ${tabId}`);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handleNavigation(tab.id)}
            activeOpacity={0.8}
          >
            <Icon
              name={tab.icon}
              size={26}
              color={isActive ? '#3B82F6' : '#9CA3AF'}
            />
            <Text style={[styles.label, { color: isActive ? '#3B82F6' : '#9CA3AF' }]}>
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
    height: 65,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
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
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default BottomNav;