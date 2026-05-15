import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tokens } from '../../core/theme/tokens';

export const GlassCard = ({ children, style }) => (
  <View style={[styles.container, style]}>
    <BlurView intensity={20} style={styles.blur} tint="light">
      <View style={styles.content}>{children}</View>
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: Tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Tokens.colors.white20,
  },
  blur: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  content: {
    padding: 16,
  },
});
