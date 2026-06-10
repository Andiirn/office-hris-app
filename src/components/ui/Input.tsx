import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TextInputProps, 
  StyleSheet, 
  StyleProp, 
  ViewStyle 
} from 'react-native';
import { Tokens } from '../../core/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  containerStyle, 
  style, 
  ...props 
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Tokens.colors.outline}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Tokens.spacing.stackMd,
    width: '100%',
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Tokens.colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Tokens.colors.inputBackground,
    borderRadius: Tokens.radius.lg,
    padding: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.text,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Tokens.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
