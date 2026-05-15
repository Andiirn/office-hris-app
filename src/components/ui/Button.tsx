import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  TextStyle,
  Platform
} from 'react-native';
import { Tokens } from '../../core/theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  loading, 
  disabled, 
  style, 
  textStyle,
  className
}) => {
  return (
    <TouchableOpacity 
      className={className}
      style={[
        styles.button, 
        disabled && styles.disabled, 
        style
      ]} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Tokens.colors.surface} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Tokens.colors.primary,
    borderRadius: Tokens.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Tokens.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Tokens.colors.surface,
  },
});
