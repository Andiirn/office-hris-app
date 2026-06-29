import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TextInputProps, 
  StyleSheet, 
  StyleProp, 
  ViewStyle,
  Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  secureTextEntry,
  ...props 
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, style, secureTextEntry && { paddingRight: 48 }]}
          placeholderTextColor={Tokens.colors.outline}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        {secureTextEntry && (
          <Pressable 
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Feather 
              name={isPasswordVisible ? 'eye' : 'eye-off'} 
              size={20} 
              color={Tokens.colors.outline} 
            />
          </Pressable>
        )}
      </View>
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
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
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
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
});
