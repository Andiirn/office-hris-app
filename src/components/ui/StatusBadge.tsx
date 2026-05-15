import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

export const StatusBadge = ({ label, type = 'error' }) => {
  const isError = type === 'error';
  const bgColor = isError ? Tokens.colors.errorContainer : Tokens.colors.secondaryContainer;
  const textColor = isError ? Tokens.colors.onErrorContainer : Tokens.colors.onSecondaryContainer;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Tokens.radius.full,
  },
  text: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
