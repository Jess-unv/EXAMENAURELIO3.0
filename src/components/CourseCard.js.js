import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  COLORS, 
  FONT_SIZES, 
  FONT_WEIGHTS, 
  BORDER_RADIUS, 
  SHADOWS, 
  SPACING 
} from '../constants/theme';

const OrderItem = ({ order, onPress, onStatusChange, isProvider = false }) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useState(new Animated.Value(80))[0];

  const statusConfig = {
    pending: {
      label: 'Pendiente',
      color: COLORS.statusPending,
      bgColor: '#FEF3C7',
      icon: 'pending',
    },
    paid: {
      label: 'Pagado',
      color: COLORS.statusPaid,
      bgColor: '#D1FAE5',
      icon: 'check-circle',
    },
    processing: {
      label: 'En proceso',
      color: COLORS.statusProcessing,
      bgColor: '#DBEAFE',
      icon: 'settings',
    },
    shipped: {
      label: 'Enviado',
      color: COLORS.secondary,
      bgColor: '#EDE9FE',
      icon: 'local-shipping',
    },
    delivered: {
      label: 'Entregado',
      color: COLORS.statusDelivered,
      bgColor: '#DCFCE7',
      icon: 'done-all',
    },
    cancelled: {
      label: 'Cancelado',
      color: COLORS.destructive,
      bgColor: '#FEE2E2',
      icon: 'cancel',
    },
  };

  const toggleExpand = () => {
    const toValue = expanded ? 80 : 200;
    Animated.spring(heightAnim, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
    setExpanded(!expanded);
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'schedule',
      paid: 'payment',
      processing: 'build',
      shipped: 'local-shipping',
      delivered: 'check-circle',
      cancelled: 'cancel',
    };
    return icons[status] || 'help';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <Animated.View style={[styles.container, { height: heightAnim }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderId}>
              {isProvider ? `#${order.id}` : `Pedido #${order.id.slice(-4)}`}
            </Text>
            <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Icon 
              name={getStatusIcon(order.status)} 
              size={12} 
              color={status.color} 
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {order.productImage ? (
            <Image 
              source={{ uri: order.productImage }} 
              style={styles.productImage} 
            />
          ) : (
            <View style={styles.productIcon}>
              <Icon name="inventory" size={24} color={COLORS.mutedForeground} />
            </View>
          )}
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {order.productName}
            </Text>
            {isProvider && (
              <Text style={styles.clientName}>
                Cliente: {order.clientName || 'Anónimo'}
              </Text>
            )}
            <Text style={styles.quantity}>
              Cantidad: {order.quantity || 1}
            </Text>
          </View>

          <Text style={styles.total}>${order.total.toFixed(2)}</Text>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailRow}>
              <Icon name="person" size={16} color={COLORS.mutedForeground} />
              <Text style={styles.detailText}>
                {isProvider ? order.clientName : order.providerName}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="phone" size={16} color={COLORS.mutedForeground} />
              <Text style={styles.detailText}>
                {order.phone || 'No especificado'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="location-on" size={16} color={COLORS.mutedForeground} />
              <Text style={styles.detailText}>
                {order.address || 'Dirección no especificada'}
              </Text>
            </View>

            {/* Action Buttons */}
            {isProvider && order.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => onStatusChange(order.id, 'processing')}
                >
                  <Icon name="check" size={16} color={COLORS.primaryForeground} />
                  <Text style={styles.acceptButtonText}>Aceptar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => onStatusChange(order.id, 'cancelled')}
                >
                  <Icon name="close" size={16} color={COLORS.destructiveForeground} />
                  <Text style={styles.cancelButtonText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!isProvider && (
              <TouchableOpacity 
                style={styles.trackButton}
                onPress={() => onPress(order.id)}
              >
                <Text style={styles.trackButtonText}>Seguir pedido</Text>
                <Icon name="chevron-right" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expand/Collapse Indicator */}
        <View style={styles.expandIndicator}>
          <Icon 
            name={expanded ? 'expand-less' : 'expand-more'} 
            size={20} 
            color={COLORS.mutedForeground} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.mutedForeground,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.muted,
    marginRight: SPACING.sm,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  clientName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.mutedForeground,
    marginBottom: SPACING.xs,
  },
  quantity: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.mutedForeground,
  },
  total: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.foreground,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.destructive,
  },
  acceptButtonText: {
    color: COLORS.primaryForeground,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  cancelButtonText: {
    color: COLORS.destructiveForeground,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  trackButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginRight: SPACING.xs,
  },
  expandIndicator: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    padding: SPACING.xs,
  },
});

export default OrderItem;