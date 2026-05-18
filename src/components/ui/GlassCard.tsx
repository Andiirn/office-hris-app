import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tokens } from '../../core/theme/tokens';

interface GlassCardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const GlassCard = ({ children, style }: GlassCardProps) => {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  
  // Extract layout/padding styles to apply to content
  const {
    padding, paddingHorizontal, paddingVertical, 
    paddingTop, paddingBottom, paddingLeft, paddingRight,
    alignItems, justifyContent, flexDirection, flexWrap,
    ...containerStyle
  } = flattenedStyle;

  const contentStyle = {
    padding, paddingHorizontal, paddingVertical,
    paddingTop, paddingBottom, paddingLeft, paddingRight,
    alignItems, justifyContent, flexDirection, flexWrap
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <BlurView intensity={30} style={styles.blur} tint="light">
        <View style={[styles.content, contentStyle]}>{children}</View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blur: {
    width: '100%',
  },
  content: {
    padding: 16, // Default padding
  },
});
