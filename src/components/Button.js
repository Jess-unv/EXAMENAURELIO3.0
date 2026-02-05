import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  COLORS, 
  FONT_SIZES, 
  FONT_WEIGHTS, 
  BORDER_RADIUS, 
  SPACING 
} from '../constants/theme';

const Button = ({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: COLORS.primary,
          borderColor: COLORS.primary,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: COLORS.primary,
          borderWidth: 2,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      case 'destructive':
        return {
          backgroundColor: COLORS.destructive,
          borderColor: COLORS.destructive,
        };
      case 'success':
        return {
          backgroundColor: COLORS.success,
          borderColor: COLORS.success,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: COLORS.primary,
          borderColor: COLORS.primary,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
        };
      case 'md':
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
        };
      case 'lg':
        return {
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.lg,
        };
      default:
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
        };
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return { color: COLORS.primary };
      case 'outline':
        return { color: COLORS.foreground };
      case 'ghost':
        return { color: COLORS.foreground };
      default:
        return { color: COLORS.primaryForeground };
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { fontSize: FONT_SIZES.sm };
      case 'md':
        return { fontSize: FONT_SIZES.base };
      case 'lg':
        return { fontSize: FONT_SIZES.md };
      default:
        return { fontSize: FONT_SIZES.base };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={
            variant === 'secondary' || variant === 'outline' || variant === 'ghost'
              ? COLORS.primary
              : COLORS.primaryForeground
          } 
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon 
              name={icon} 
              size={getTextSizeStyle().fontSize} 
              color={getTextVariantStyle().color}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              getTextVariantStyle(),
              getTextSizeStyle(),
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon 
              name={icon} 
              size={getTextSizeStyle().fontSize} 
              color={getTextVariantStyle().color}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  leftIcon: {
    marginRight: SPACING.xs,
  },
  rightIcon: {
    marginLeft: SPACING.xs,
  },
});

export default Button;