// src/hooks/useProviderNavigation.js
import { useNavigation } from '@react-navigation/native';

export const useProviderNavigation = () => {
  const navigation = useNavigation();

  const navigateToProviderScreen = (screenName) => {
    console.log(`[useProviderNavigation] Navegando a: ${screenName}`);
    
    try {
      // Primero intentamos navegar directamente
      navigation.navigate(screenName);
    } catch (error) {
      console.error(`Error navegando a ${screenName}:`, error);
      
      // Si falla, intentamos un enfoque diferente
      if (navigation.canGoBack()) {
        navigation.goBack();
        setTimeout(() => {
          navigation.navigate(screenName);
        }, 100);
      }
    }
  };

  return { navigateToProviderScreen };
};