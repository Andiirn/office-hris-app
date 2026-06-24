import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MotiView } from 'moti';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

interface SuccessAnimationProps {
  visible: boolean;
  title?: string;
  message?: string;
  onDone?: () => void;
}

export function SuccessAnimation({
  visible,
  title = 'Berhasil!',
  message = 'Pengajuan Anda sedang diproses.',
  onDone
}: SuccessAnimationProps) {

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onDone?.();
    }, 2200);

    return () => clearTimeout(timer);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* fade overlay */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 200 }}
        style={StyleSheet.absoluteFill}
      />

      {/* card */}
      <MotiView
        from={{ opacity: 0, scale: 0.85, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 16, stiffness: 180 }}
        style={styles.card}
      >
        {/* icon container */}
        <MotiView
          from={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          style={styles.iconContainer}
        >
          {/* pulse ring */}
          <MotiView
            from={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{
              loop: true,
              type: 'timing',
              duration: 1200
            }}
            style={styles.pulse}
          />

          {/* check icon */}
          <MotiView
            from={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            <MaterialIcons
              name="check"
              size={44}
              color={Tokens.colors.primary}
            />
          </MotiView>
        </MotiView>

        {/* text */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
          style={styles.textContainer}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </MotiView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '78%',
    maxWidth: 320,
    alignItems: 'center',
  },

  iconContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(0, 6, 102, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'visible',
  },

  pulse: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Tokens.colors.primary,
    opacity: 0.2,
  },

  textContainer: {
    alignItems: 'center',
    gap: 6,
  },

  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: Tokens.colors.primary,
    textAlign: 'center',
  },

  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Tokens.colors.textMuted,
    textAlign: 'center',
  }
});