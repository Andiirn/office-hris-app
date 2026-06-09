import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  nik: z.string().min(1, 'NIK is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
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
        Alert.alert('Error', 'Failed to retrieve user profile');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      Alert.alert('Error', errorMessage);
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text className='font-manrope-bold text-3xl text-black mb-2'>Welcome Back</Text>
          <Text className='font-inter-regular text-sm text-text-muted'>Sign in to your account to continue</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="nik"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="NIK"
                placeholder="Enter your NIK"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.nik?.message}
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                secureTextEntry
              />
            )}
          />

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={mutation.isPending}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Tokens.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Tokens.spacing.page,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    color: Tokens.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.outline,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: 8,
  },
});
