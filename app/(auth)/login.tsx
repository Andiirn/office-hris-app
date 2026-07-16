import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import * as z from 'zod';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { tokenStore } from '../../src/core/auth/token-store';
import { Tokens } from '../../src/core/theme/tokens';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

const loginSchema = z.object({
  nik: z.string().min(1, 'NIK diperlukan'),
  password: z.string().min(1, 'Password diperlukan'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      nik: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      authService.login(values.nik, values.password),
    onSuccess: async (data) => {
      const { access_token, refresh_token } = data;

      // Save tokens first so they can be used by the API interceptor for getProfile
      await tokenStore.setTokens(access_token, refresh_token);

      try {
        const profile = await authService.getProfile();
        const userData = {
          id: profile.id,
          nik: profile.nik || '',
          full_name: profile.full_name || '',
          role: profile.role,
          position_name: profile.position_name,
          department_name: profile.department_name,
          branch_name: profile.branch_name,
          email: profile.email,
          phone: profile.phone,
          photo_url: profile.photo_url,
        };
        await setAuth(userData, access_token, refresh_token);
        router.replace('/(tabs)');
      } catch (err) {
        console.error('[Login] Failed to fetch profile after login:', err);
        Alert.alert('Gagal', 'Gagal mengambil profil pengguna. Coba lagi.');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Login gagal';
      Alert.alert('Login Gagal', errorMessage);
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 1000 }}
            style={styles.backdropTop}
          />
          <MotiView
            from={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 1000 }}
            style={styles.backdropBottom}
          />

          <View style={styles.shell}>
            <View style={styles.heroCard}>
              <View style={styles.header}>
                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 150 }}
                >
                  <Text style={styles.title}>Selamat Datang</Text>
                </MotiView>
                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 250 }}
                >
                  <Text style={styles.subtitle}>
                    Masuk dengan akun Anda untuk melanjutkan
                  </Text>
                </MotiView>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Informasi login</Text>
                <Text style={styles.infoText}>
                  Kredensial / NIK silahkan minta ke HRD jika belum memiliki akses.
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.form}>
                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 350 }}
                >
                  <Controller
                    control={control}
                    name="nik"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Nomor Induk Karyawan (NIK)"
                        placeholder="Masukkan NIK Anda"
                        onBlur={onBlur}
                        autoCapitalize="none"
                        onChangeText={onChange}
                        value={value}
                        error={errors.nik?.message}
                      />
                    )}
                  />
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 450 }}
                  style={{ marginTop: 16 }}
                >
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Password"
                        placeholder="Masukkan Password Anda"
                        onBlur={onBlur}
                        autoComplete='password'
                        textContentType="password"
                        onChangeText={onChange}
                        value={value}
                        error={errors.password?.message}
                        secureTextEntry
                      />
                    )}
                  />
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.5, translateY: 30 }}
                  animate={{ opacity: 1, scale: 1, translateY: 0 }}
                  transition={{
                    type: 'spring',
                    delay: 600,
                    damping: 10,
                  }}
                >
                  <Button
                    title={mutation.isPending ? 'Memproses...' : 'Sign In'}
                    onPress={handleSubmit((values) => {
                      onSubmit(values);
                    })}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                    style={styles.button}
                  />
                </MotiView>

                <Pressable onPress={() => router.push('/(auth)/reset-password')} style={styles.resetLink}>
                  <Text style={styles.resetLinkText}>Lupa password? Reset di sini</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Tokens.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Tokens.spacing.page,
    paddingVertical: 18,
    justifyContent: 'center',
    position: 'relative',
  },
  backdropTop: {
    position: 'absolute',
    top: -40,
    right: -120,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  backdropBottom: {
    position: 'absolute',
    left: -90,
    bottom: 20,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(190, 18, 60, 0.08)',
  },
  shell: {
    width: '100%',
    gap: 16,
  },
  heroCard: {
    backgroundColor: Tokens.colors.surfaceContainerLowest,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Tokens.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Tokens.colors.onSecondaryContainer,
    letterSpacing: 0.4,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  illustration: {
    width: '100%',
    maxWidth: 360,
    height: undefined,
    aspectRatio: 1.08,
    resizeMode: 'contain',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    color: Tokens.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Tokens.colors.textMuted,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: 16,
    backgroundColor: Tokens.colors.inputBackground,
    borderRadius: Tokens.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Tokens.colors.outlineVariant,
  },
  infoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Tokens.colors.primaryContainer,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Tokens.colors.onSurfaceVariant,
  },
  formCard: {
    backgroundColor: Tokens.colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  form: {
    width: '100%',
  },
  errorBox: {
    marginTop: 4,
    marginBottom: 8,
  },
  button: {
    marginTop: 4,
  },
  resetLink: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  resetLinkText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Tokens.colors.primary,
  },
});
