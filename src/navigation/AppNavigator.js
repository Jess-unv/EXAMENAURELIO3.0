import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";

// IMPORTS DE PANTALLAS
import AuthScreen from "../screens/AuthScreen";
import ClientDashboard from "../screens/ClientDashboard";
import AdminDashboard from "../screens/AdminDashboard";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import EnrollmentHistoryScreen from "../screens/EnrollmentHistoryScreen";
import PaymentScreen from "../screens/PaymentScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddCourseScreen from "../screens/AddCourseScreen";
import AdminCoursesScreen from "../screens/AdminCoursesScreen";
import AdminEnrollments from "../screens/AdminEnrollments";
import CourseViewScreen from "../screens/CourseViewScreen";
import EditCourseScreen from "../screens/EditCourseScreen";
import AdminPreviewScreen from "../screens/AdminPreviewScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- TABS PARA ADMINISTRADOR ---
function AdminTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "AdminHome") iconName = "view-dashboard";
          else if (route.name === "AdminEnrollments") iconName = "account-group";
          else if (route.name === "AdminCourses") iconName = "book-multiple";
          else if (route.name === "AdminProfile") iconName = "account-cog";
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        // ESTILO BASE DE HEADERS (COMO EL DEL CLIENTE)
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "bold" },
        headerLeft: () => (
          <TouchableOpacity 
            style={{ marginLeft: 15 }} 
            onPress={() => navigation.navigate("AdminHome")}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
      })}
    >
      {/* PANEL SIN HEADER */}
      <Tab.Screen 
        name="AdminHome" 
        component={AdminDashboard} 
        options={{ 
          title: "PANEL", 
          headerShown: false 
        }} 
      />

      {/* CURSOS CON HEADER Y FLECHA */}
      <Tab.Screen 
        name="AdminCourses" 
        component={AdminCoursesScreen} 
        options={{ title: "CURSOS" }} 
      />

      {/* PERFIL CON HEADER Y FLECHA */}
      <Tab.Screen 
        name="AdminProfile" 
        component={ProfileScreen} 
        options={{ title: "MI PERFIL" }} 
      />
      <Tab.Screen 
      name="AdminEnrollments" 
      component={AdminEnrollments} 
      />
      
    </Tab.Navigator>
  );
}

// --- NAVEGADOR PRINCIPAL ---
export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  // Estilo común para Stacks (Clientes y Admin Sub-screens)
  const sharedHeaderOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.card,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: "bold" },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  // --- STACK PARA ADMINISTRADOR ---
  if (user.role === "admin") {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="AddCourse" component={AddCourseScreen} options={{ ...sharedHeaderOptions, title: "AGREGAR CURSO" }} />
        <Stack.Screen name="EditCourse" component={EditCourseScreen} options={{ ...sharedHeaderOptions, title: "EDITAR CURSO" }} />
        <Stack.Screen name="AdminPreview" component={AdminPreviewScreen} options={{ ...sharedHeaderOptions, title: "VISTA PREVIA" }} />
      </Stack.Navigator>
    );
  }

  // --- STACK PARA CLIENTES ---
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false, 
        cardStyle: { backgroundColor: colors.background } 
      }}
    >
      <Stack.Screen name="ClientHome" component={ClientDashboard} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ ...sharedHeaderOptions, title: "DETALLES" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ ...sharedHeaderOptions, title: "PAGO" }} />
      <Stack.Screen name="CourseView" component={CourseViewScreen} options={{ ...sharedHeaderOptions, title: "MI CURSO" }} />
      <Stack.Screen name="ClientEnrollments" component={EnrollmentHistoryScreen} options={{ ...sharedHeaderOptions, title: "MIS CURSOS" }} />
      <Stack.Screen name="ClientProfile" component={ProfileScreen} options={{ ...sharedHeaderOptions, title: "MI PERFIL" }} />
    </Stack.Navigator>
  );
}