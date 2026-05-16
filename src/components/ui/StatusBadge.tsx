import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

interface StatusBadgeProps {
  label?: string;
  type?: 'secondary' | 'error' | 'warning';
}

export const StatusBadge = ({ label, type = 'secondary' }: StatusBadgeProps) => {
  let bgColor = Tokens.colors.secondaryContainer;
  let textColor = Tokens.colors.onSecondaryContainer;

  if (type === 'error') {
    bgColor = Tokens.colors.errorContainer;
    textColor = Tokens.colors.onErrorContainer;
  } else if (type === 'warning') {
    bgColor = Tokens.colors.tertiaryFixed;
    textColor = Tokens.colors.onTertiaryContainer;
  }

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
