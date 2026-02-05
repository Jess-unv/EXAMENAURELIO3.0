import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Image,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { useOrders } from "../context/OrderContext";
import { supabase } from "../utils/supabase";

const { width, height } = Dimensions.get("window");

const statusConfig = {
  pending: {
    label: "Pendiente",
    color: "#F59E0B",
    bg: "#FEF3C7",
    icon: "schedule",
    darkBg: "#451a03",
    action: "Esperando confirmación",
  },
  paid: {
    label: "Pagado",
    color: "#10B981",
    bg: "#D1FAE5",
    icon: "check-circle",
    darkBg: "#064e3b",
    action: "Pago confirmado",
  },
  processing: {
    label: "En proceso",
    color: "#3B82F6",
    bg: "#DBEAFE",
    icon: "settings",
    darkBg: "#1e3a8a",
    action: "Preparando tu pedido",
  },
  shipped: {
    label: "Enviado",
    color: "#8B5CF6",
    bg: "#EDE9FE",
    icon: "local-shipping",
    darkBg: "#4c1d95",
    action: "En camino a tu dirección",
  },
  delivered: {
    label: "Entregado",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "check-circle",
    darkBg: "#064e3b",
    action: "Pedido entregado",
  },
  cancelled: {
    label: "Cancelado",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "cancel",
    darkBg: "#450a0a",
    action: "Pedido cancelado",
  },
};

export default function OrderStatusScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { orderId } = route.params || {};
  const { getOrderById } = useOrders();

  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
      startPulseAnimation();
    }
  }, [orderId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      if (!orderId) {
        throw new Error("No se proporcionó ID de pedido");
      }

      console.log("Cargando detalles del pedido:", orderId);

      const result = await getOrderById(orderId);

      if (!result.success) {
        throw new Error(result.error || "Error al cargar el pedido");
      }

      console.log("Pedido cargado:", result.order);

      const order = result.order;
      const timeline = generateTimeline(order);

      const processedOrder = {
        ...order,
        orderNumber:
          order.orderNumber ||
          order.order_number ||
          `ORD-${order.id?.slice(-8).toUpperCase()}`,
        date: order.created_at || order.createdAt,
        total: parseFloat(order.total) || 0,
        status: order.status || "pending",
        items: (order.items || []).map((item) => ({
          id: item.id || item.product_id,
          name: item.product?.name || "Producto sin nombre",
          price: parseFloat(item.unit_price || item.product?.price || 0),
          quantity: item.quantity || 1,
          image: item.product?.images?.[0] || null,
          product: item.product,
        })),
        shipping: {
          address: order.shipping_address || "Dirección no especificada",
          method: order.payment_method || "Método no especificado",
          trackingNumber: order.stripe_payment_id || "N/A",
          estimatedDelivery: calculateEstimatedDelivery(order.created_at),
          actualDelivery:
            order.status === "delivered"
              ? formatDateForDisplay(order.updated_at)
              : "No entregado aún",
          carrier: "Transportista no especificado",
          phone:
            order.client?.phone ||
            order.notes?.match(/Teléfono: (\d+)/)?.[1] ||
            "Sin teléfono",
        },
        payment: {
          method: order.payment_method || "No especificado",
          lastFour: "****",
          status: order.payment_status === "paid" ? "Pagado" : "Pendiente",
          transactionId:
            order.stripe_payment_id || order.id?.slice(-12).toUpperCase(),
          amount: parseFloat(order.total) || 0,
          date: order.created_at || new Date().toISOString(),
        },
        provider: order.provider || {
          name: "Proveedor no disponible",
          phone: "Sin teléfono",
          email: "Sin email",
        },
        client: order.client,
        timeline: timeline,
        notes: order.notes,
        cancelable_until: order.cancelable_until,
        cancellation_reason: order.cancellation_reason,
      };

      setOrderDetails(processedOrder);
    } catch (error) {
      console.error("Error loading order details:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los detalles del pedido",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTimeline = (order) => {
    const timeline = [];
    const createdAt = new Date(order.created_at);

    timeline.push({
      status: "ordered",
      label: "Pedido realizado",
      date: formatDateForDisplay(order.created_at),
      completed: true,
      icon: "shopping-bag",
    });

    if (order.payment_status === "paid") {
      timeline.push({
        status: "paid",
        label: "Pago confirmado",
        date: formatDateForDisplay(order.updated_at || order.created_at),
        completed: true,
        icon: "payment",
      });
    } else {
      timeline.push({
        status: "paid",
        label: "Pago pendiente",
        date: "En espera",
        completed: false,
        icon: "payment",
      });
    }

    if (["processing", "shipped", "delivered"].includes(order.status)) {
      timeline.push({
        status: "processing",
        label: "Preparando pedido",
        date: formatDateForDisplay(order.updated_at),
        completed: true,
        icon: "build",
      });
    } else {
      timeline.push({
        status: "processing",
        label: "Preparando pedido",
        date: "Próximamente",
        completed: false,
        icon: "build",
      });
    }

    if (["shipped", "delivered"].includes(order.status)) {
      timeline.push({
        status: "shipped",
        label: "Enviado",
        date: formatDateForDisplay(order.updated_at),
        completed: true,
        icon: "local-shipping",
      });
    } else {
      timeline.push({
        status: "shipped",
        label: "Envío",
        date: "Próximamente",
        completed: false,
        icon: "local-shipping",
      });
    }

    if (order.status === "delivered") {
      timeline.push({
        status: "delivered",
        label: "Entregado",
        date: formatDateForDisplay(order.updated_at),
        completed: true,
        icon: "check-circle",
      });
    } else {
      timeline.push({
        status: "delivered",
        label: "Entrega",
        date: "Próximamente",
        completed: false,
        icon: "check-circle",
      });
    }

    return timeline;
  };

  const calculateEstimatedDelivery = (createdAt) => {
    if (!createdAt) return "Fecha estimada no disponible";

    const createdDate = new Date(createdAt);
    const estimatedDate = new Date(createdDate);
    estimatedDate.setDate(estimatedDate.getDate() + 3);

    return estimatedDate.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "Fecha no disponible";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrderDetails();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";

    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return (
          "Hoy " +
          date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } else if (date.toDateString() === yesterday.toDateString()) {
        return (
          "Ayer " +
          date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } else {
        return date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const getStatusColor = (status) => {
    return statusConfig[status]?.color || "#6B7280";
  };

  const navigateToHome = () => {
    navigation.navigate("ClientHome");
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [240, 140],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });

  // Función renderTimelineStep (esto faltaba en tu código)
  const renderTimelineStep = (step, index, totalSteps) => {
    const isLast = index === totalSteps - 1;
    const isActive = step.completed;
    const statusColor = getStatusColor(step.status);

    return (
      <View key={step.status} style={styles.timelineStep}>
        <View style={styles.timelineIconContainer}>
          {!isLast && (
            <View
              style={[
                styles.timelineConnector,
                {
                  backgroundColor: isActive
                    ? statusColor
                    : isDarkMode
                      ? "#374151"
                      : "#E5E7EB",
                },
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.timelineIconWrapper,
              {
                backgroundColor: isActive
                  ? statusColor
                  : isDarkMode
                    ? "#374151"
                    : "#F3F4F6",
                transform: [{ scale: isActive ? pulseAnim : 1 }],
              },
            ]}
          >
            <Icon
              name={step.icon}
              size={20}
              color={isActive ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </Animated.View>
        </View>

        <View style={styles.timelineContent}>
          <Text
            style={[
              styles.timelineLabel,
              { color: isActive ? colors.text : colors.textSecondary },
            ]}
          >
            {step.label}
          </Text>
          <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>
            {step.date}
          </Text>
          {isActive && (
            <View
              style={[
                styles.completedBadge,
                { backgroundColor: isDarkMode ? "#064e3b" : "#D1FAE5" },
              ]}
            >
              <Icon name="check" size={12} color="#10B981" />
              <Text style={[styles.completedText, { color: "#10B981" }]}>
                Completado
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !orderDetails) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Cargando detalles del pedido...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={60} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            No se encontró el pedido
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver atrás</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = orderDetails?.status || "pending";
  const statusInfo = statusConfig[currentStatus];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={statusInfo?.color || colors.primary}
        translucent
      />

      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
            backgroundColor: statusInfo?.color || colors.primary,
          },
        ]}
      >
        <Animated.View
          style={[styles.headerContent, { opacity: headerOpacity }]}
        >
          <View style={styles.headerTop}>
            <Animated.View style={{ opacity: titleOpacity }}>
              <Text style={styles.headerTitleSmall}>
                Pedido #{orderDetails?.orderNumber}
              </Text>
            </Animated.View>
          </View>

          <View style={styles.headerMain}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icon
                name={statusInfo?.icon || "help"}
                size={60}
                color="#FFFFFF"
              />
            </Animated.View>
            <Text style={styles.orderStatusText}>
              {statusInfo?.label || "Estado desconocido"}
            </Text>
            <Text style={styles.orderActionText}>
              {statusInfo?.action || ""}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[statusInfo?.color || colors.primary]}
            tintColor={statusInfo?.color || colors.primary}
          />
        }
      >
        <Animated.View
          style={[
            styles.orderInfoBanner,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.orderInfoHeader}>
            <Text style={[styles.orderInfoTitle, { color: colors.text }]}>
              #{orderDetails?.orderNumber}
            </Text>
            <Text
              style={[styles.orderInfoDate, { color: colors.textSecondary }]}
            >
              {formatDate(orderDetails?.date)}
            </Text>
          </View>

          <View style={styles.orderInfoGrid}>
            <View style={styles.orderInfoItem}>
              <Icon name="receipt" size={20} color={colors.primary} />
              <Text
                style={[styles.orderInfoLabel, { color: colors.textSecondary }]}
              >
                Total
              </Text>
              <Text style={[styles.orderInfoValue, { color: colors.text }]}>
                {formatCurrency(orderDetails?.total || 0)}
              </Text>
            </View>

            <View style={styles.orderInfoItem}>
              <Icon name="local-shipping" size={20} color="#8B5CF6" />
              <Text
                style={[styles.orderInfoLabel, { color: colors.textSecondary }]}
              >
                Método
              </Text>
              <Text style={[styles.orderInfoValue, { color: colors.text }]}>
                {orderDetails?.shipping?.method || "No especificado"}
              </Text>
            </View>

            <View style={styles.orderInfoItem}>
              <Icon name="store" size={20} color="#10B981" />
              <Text
                style={[styles.orderInfoLabel, { color: colors.textSecondary }]}
              >
                Proveedor
              </Text>
              <Text
                style={[styles.orderInfoValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {orderDetails?.provider?.name || "No disponible"}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View
          style={[styles.timelineSection, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Progreso del pedido
            </Text>
            <View style={styles.deliveryStatus}>
              <Icon
                name={statusInfo?.icon || "help"}
                size={16}
                color={statusInfo?.color}
              />
              <Text
                style={[
                  styles.deliveryStatusText,
                  { color: statusInfo?.color },
                ]}
              >
                {statusInfo?.label}
              </Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            {orderDetails?.timeline?.map((step, index) =>
              renderTimelineStep(step, index, orderDetails.timeline.length),
            )}
          </View>
        </View>

        <View
          style={[styles.productsSection, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Productos ({orderDetails?.items?.length || 0})
            </Text>
            <Text style={[styles.seeAllText, { color: colors.textSecondary }]}>
              {orderDetails?.items?.length || 0} items
            </Text>
          </View>

          {orderDetails?.items?.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                styles.productCard,
                { backgroundColor: isDarkMode ? "#1F2937" : "#F9FAFB" },
              ]}
            >
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                />
              ) : (
                <View
                  style={[
                    styles.productImage,
                    {
                      backgroundColor: colors.border,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Icon
                    name="shopping-bag"
                    size={30}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text
                  style={[styles.productName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View style={styles.productDetails}>
                  <View style={styles.quantityBadge}>
                    <Text
                      style={[
                        styles.quantityText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      x{item.quantity}
                    </Text>
                  </View>
                  <Text
                    style={[styles.productPrice, { color: colors.primary }]}
                  >
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.detailsSection}>
          <Animated.View
            style={[
              styles.detailCard,
              {
                backgroundColor: colors.card,
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.detailHeader}>
              <Icon name="location-on" size={24} color={colors.primary} />
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                Información de envío
              </Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {orderDetails?.shipping?.address}
              </Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Teléfono
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {orderDetails?.shipping?.phone}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Entrega estimada
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {orderDetails?.shipping?.estimatedDelivery}
                  </Text>
                </View>
              </View>

              {orderDetails?.shipping?.trackingNumber &&
                orderDetails.shipping.trackingNumber !== "N/A" && (
                  <TouchableOpacity
                    style={[
                      styles.copyButton,
                      { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
                    ]}
                    onPress={() =>
                      copyToClipboard(orderDetails.shipping.trackingNumber)
                    }
                  >
                    <Icon
                      name="content-copy"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.copyText, { color: colors.textSecondary }]}
                    >
                      {orderDetails.shipping.trackingNumber}
                    </Text>
                    <Text
                      style={[
                        styles.copyLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      (Copiar)
                    </Text>
                  </TouchableOpacity>
                )}

              {orderDetails?.status === "delivered" && (
                <View style={styles.deliveryInfo}>
                  <Icon
                    name="calendar-today"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.deliveryInfoText, { color: colors.text }]}
                  >
                    Entregado: {orderDetails?.shipping?.actualDelivery}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.detailCard,
              {
                backgroundColor: colors.card,
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.detailHeader}>
              <Icon name="credit-card" size={24} color={colors.primary} />
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                Información de pago
              </Text>
            </View>
            <View style={styles.detailContent}>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Método
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {orderDetails?.payment?.method}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Estado
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          orderDetails?.payment?.status === "Pagado"
                            ? isDarkMode
                              ? "#064e3b"
                              : "#D1FAE5"
                            : isDarkMode
                              ? "#451a03"
                              : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            orderDetails?.payment?.status === "Pagado"
                              ? "#10B981"
                              : "#F59E0B",
                        },
                      ]}
                    >
                      {orderDetails?.payment?.status}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Transacción
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(orderDetails?.payment?.transactionId)
                    }
                  >
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {orderDetails?.payment?.transactionId}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Fecha
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(orderDetails?.payment?.date)}
                  </Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text
                  style={[styles.amountLabel, { color: colors.textSecondary }]}
                >
                  Monto total:
                </Text>
                <Text style={[styles.amountValue, { color: "#10B981" }]}>
                  {formatCurrency(orderDetails?.payment?.amount)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {orderDetails?.notes && (
            <Animated.View
              style={[
                styles.detailCard,
                {
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <View style={styles.detailHeader}>
                <Icon name="notes" size={24} color={colors.primary} />
                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  Notas adicionales
                </Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {orderDetails.notes}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={navigateToHome}
          >
            <Icon name="shopping-bag" size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Seguir comprando</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitleSmall: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    opacity: 0.9,
  },
  headerMain: {
    alignItems: "center",
  },
  orderStatusText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
    marginBottom: 5,
  },
  orderActionText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 16,
  },
  helpInput: {
    height: 120,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  contactInfo: {
    fontSize: 14,
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  orderInfoBanner: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderInfoHeader: {
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  orderInfoDate: {
    fontSize: 14,
  },
  orderInfoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  deliveryStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliveryStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineContainer: {
    marginLeft: 10,
  },
  timelineStep: {
    flexDirection: "row",
    marginBottom: 28,
  },
  timelineIconContainer: {
    alignItems: "center",
    marginRight: 20,
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    top: 32,
    left: 15.5,
    width: 2,
    height: "100%",
    zIndex: 0,
  },
  timelineIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 13,
    marginBottom: 8,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  productsSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  productCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityBadge: {
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityText: {
    fontSize: 13,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 17,
    fontWeight: "bold",
  },
  detailsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  detailCard: {
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  detailContent: {
    gap: 16,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  copyText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  copyLabel: {
    fontSize: 12,
    fontStyle: "italic",
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deliveryInfoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 15,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
