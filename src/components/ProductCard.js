// src/components/ProductCard.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  SPACING,
} from "../constants/theme";

const ProductCard = ({ product, onPress, onAddToCart, style }) => {
  const [isFavorite, setIsFavorite] = useState(product.isFavorite);
  const scaleAnim = new Animated.Value(1);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleQuickAdd = () => {
    // Asegurar que el producto tenga provider_id antes de agregar al carrito
    const productWithProvider = {
      ...product,
      provider_id: product.provider_id, // Asegurar que este campo exista
      providerId: product.provider_id || product.providerId, // Compatibilidad
    };

    onAddToCart(productWithProvider);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: scaleAnim }] }, style]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Badges */}
        <View style={styles.badgesContainer}>
          {product.isNew && (
            <View style={[styles.badge, styles.newBadge]}>
              <Text style={styles.badgeText}>NUEVO</Text>
            </View>
          )}
          {product.discountPrice && (
            <View style={[styles.badge, styles.discountBadge]}>
              <Text style={styles.badgeText}>
                {Math.round(
                  ((product.price - product.discountPrice) / product.price) *
                    100,
                )}
                %
              </Text>
            </View>
          )}
          {product.stock < 10 && product.stock > 0 && (
            <View style={[styles.badge, styles.stockBadge]}>
              <Text style={styles.badgeText}>
                {product.stock} {product.stock === 1 ? "último" : "últimos"}
              </Text>
            </View>
          )}
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavorite}
          activeOpacity={0.7}
        >
          <Icon
            name={isFavorite ? "favorite" : "favorite-border"}
            size={20}
            color={isFavorite ? COLORS.destructive : COLORS.mutedForeground}
          />
        </TouchableOpacity>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {product.stock === 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>AGOTADO</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.ratingContainer}>
            <Icon name="star" size={FONT_SIZES.sm} color="#FFB800" />
            <Text style={styles.rating}>{product.rating}</Text>
            <Text style={styles.reviews}>({product.reviews})</Text>
          </View>

          <View style={styles.priceContainer}>
            {product.discountPrice ? (
              <>
                <Text style={styles.discountPrice}>
                  ${product.discountPrice.toFixed(2)}
                </Text>
                <Text style={styles.originalPrice}>
                  ${product.price.toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            )}
          </View>

          {/* Quick Add Button */}
          <TouchableOpacity
            style={[
              styles.quickAddButton,
              product.stock === 0 && styles.disabledButton,
            ]}
            onPress={handleQuickAdd}
            disabled={product.stock === 0}
            activeOpacity={0.7}
          >
            <Icon
              name="add-shopping-cart"
              size={16}
              color={
                product.stock === 0
                  ? COLORS.mutedForeground
                  : COLORS.primaryForeground
              }
            />
            <Text
              style={[
                styles.quickAddText,
                product.stock === 0 && styles.disabledText,
              ]}
            >
              {product.stock === 0 ? "Agotado" : "Agregar"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: "50%",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.md,
    marginBottom: SPACING.sm,
  },
  badgesContainer: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    zIndex: 2,
    flexDirection: "column",
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  newBadge: {
    backgroundColor: COLORS.success,
  },
  discountBadge: {
    backgroundColor: COLORS.destructive,
  },
  stockBadge: {
    backgroundColor: COLORS.warning,
  },
  badgeText: {
    color: COLORS.primaryForeground,
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: FONT_WEIGHTS.bold,
  },
  favoriteButton: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: COLORS.muted,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: COLORS.primaryForeground,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    transform: [{ rotate: "-45deg" }],
  },
  productInfo: {
    padding: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
    height: 40,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  rating: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.mutedForeground,
    marginLeft: SPACING.xs,
    marginRight: SPACING.xs,
  },
  reviews: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.mutedForeground,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  price: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  discountPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  originalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.mutedForeground,
    textDecorationLine: "line-through",
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  disabledButton: {
    backgroundColor: COLORS.border,
  },
  quickAddText: {
    color: COLORS.primaryForeground,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  disabledText: {
    color: COLORS.mutedForeground,
  },
});

export default ProductCard;
