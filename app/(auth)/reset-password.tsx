import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as z from 'zod';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { authService } from '../../src/services/auth.service';
import {
  getMissingPasswordRequirements,
  validatePasswordRequirements,
} from '../../src/utils/password-validator';

const requestSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
});

const verifySchema = z.object({
  otp_code: z.string().length(6, 'OTP harus 6 digit'),
});

const resetSchema = z
  .object({
    new_password: z.string(),
    confirm_password: z.string(),
  })
  .superRefine((data, ctx) => {
    const missing = getMissingPasswordRequirements(data.new_password);
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_password'],
        message: `Password kurang: ${missing.join(', ')}`,
      });
    }
    if (data.confirm_password !== data.new_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm_password'],
        message: 'Konfirmasi password tidak sama',
      });
    }
  });

type RequestValues = z.infer<typeof requestSchema>;
type VerifyValues = z.infer<typeof verifySchema>;
type ResetValues = z.infer<typeof resetSchema>;

type Step = 'request' | 'verify' | 'reset';
type Method = 'EMAIL' | 'WHATSAPP';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [method, setMethod] = useState<Method>('EMAIL');
  const [requestedNik, setRequestedNik] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { nik: '' },
  });
  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp_code: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const watchNewPassword = resetForm.watch('new_password') || '';
  const passwordReqs = validatePasswordRequirements(watchNewPassword);
  const requirementItems = [
    { key: 'length', label: '8-12 karakter', met: passwordReqs.hasValidLength },
    { key: 'uppercase', label: 'Minimal 1 huruf besar (A-Z)', met: passwordReqs.hasUppercase },
    { key: 'lowercase', label: 'Minimal 1 huruf kecil (a-z)', met: passwordReqs.hasLowercase },
    { key: 'number', label: 'Minimal 1 angka (0-9)', met: passwordReqs.hasNumber },
    { key: 'special', label: 'Minimal 1 karakter khusus / simbol (!@#$%^&*()_+-=...)', met: passwordReqs.hasSpecialChar },
  ];

  const requestMutation = useMutation({
    mutationFn: async (values: RequestValues) => {
      const response = await authService.requestForgotPassword({
        nik: values.nik,
        method,
      });
      return response;
    },
    onSuccess: (data, values) => {
      setRequestedNik(values.nik);
      setMaskedDestination(data.masked_destination);
      setInfoMessage(`OTP dikirim ke ${data.masked_destination}`);
      setStep('verify');
    },
    onError: (error: any) => {
      setInfoMessage(error.response?.data?.message || error.message || 'Gagal meminta OTP');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (values: VerifyValues) => {
      const response = await authService.verifyForgotPasswordOtp({
        nik: requestedNik,
        otp_code: values.otp_code,
      });
      return response;
    },
    onSuccess: (data) => {
      setResetToken(data.reset_token);
      setInfoMessage('');
      setStep('reset');
    },
    onError: (error: any) => {
      setInfoMessage(error.response?.data?.message || error.message || 'OTP tidak valid');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (values: ResetValues) => {
      if (values.new_password !== values.confirm_password) {
        throw new Error('Konfirmasi password tidak sama');
      }
      await authService.resetForgotPassword({
        reset_token: resetToken,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
    },
    onSuccess: () => {
      setInfoMessage('Password berhasil diubah. Silakan login kembali.');
      router.replace('/(auth)/login');
    },
    onError: (error: any) => {
      setInfoMessage(error.response?.data?.message || error.message || 'Gagal reset password');
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fbf9f8' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fbf9f8' }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="gap-4">
            <View className="bg-white rounded-[28px] p-5 gap-3 shadow-sm">
              <Text className="font-manrope-extrabold text-[28px] leading-[34px] text-on-surface">Buat password baru</Text>
              <Text className="font-inter text-sm leading-5 text-text-muted">
                Ikuti tiga langkah singkat untuk memulihkan akses akun Anda.
              </Text>

              {infoMessage ? <Text className="font-inter-bold text-[13px] text-primary-container bg-surface-container-low border border-outline-variant rounded-2xl p-3">{infoMessage}</Text> : null}

              <View className="flex-row items-center gap-2 mt-1">
                {(['request', 'verify', 'reset'] as Step[]).map((item) => {
                  const isActive = step === item;
                  return (
                    <View
                      key={item}
                      className={`rounded-full ${isActive ? 'w-6 h-2.5 bg-black' : 'w-2.5 h-2.5 bg-gray-300'
                        }`}
                    />
                  );
                })}
              </View>

              {step === 'request' ? (
                <View className="gap-3 mt-1">
                  <Controller
                    control={requestForm.control}
                    name="nik"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="NIK"
                        placeholder="Masukkan NIK"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={requestForm.formState.errors.nik?.message}
                        autoCapitalize="none"
                      />
                    )}
                  />

                  <Text className="font-inter-bold text-xs text-on-surface -mb-0.5">Metode OTP</Text>
                  <View className="flex-row gap-2">
                    {(['EMAIL', 'WHATSAPP'] as Method[]).map((item) => {
                      const isActive = method === item;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => setMethod(item)}
                          className={`flex-1 flex-row items-center justify-center py-2 rounded-xl border ${isActive
                            ? 'bg-primary border-primary'
                            : 'bg-white border-gray-200'
                            }`}
                        >
                          <Text className={`font-inter-bold text-xs ${isActive ? 'text-white' : 'text-on-surface-variant'}`}>
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Button
                    title="Kirim OTP"
                    onPress={requestForm.handleSubmit((values) => requestMutation.mutate(values))}
                    loading={requestMutation.isPending}
                  />
                </View>
              ) : null}

              {step === 'verify' ? (
                <View className="gap-3 mt-1">
                  <Text className="font-inter text-[13px] text-text-muted">OTP dikirim ke {maskedDestination || 'tujuan terdaftar'}</Text>
                  <Controller
                    control={verifyForm.control}
                    name="otp_code"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Masukan Kode OTP"
                        placeholder="6 digit kode"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={verifyForm.formState.errors.otp_code?.message}
                        keyboardType="number-pad"
                      />
                    )}
                  />

                  <Button
                    title="Verifikasi OTP"
                    onPress={verifyForm.handleSubmit((values) => verifyMutation.mutate(values))}
                    loading={verifyMutation.isPending}
                  />

                  <Pressable
                    onPress={async () => {
                      try {
                        await authService.resendForgotPasswordOtp(requestedNik);
                        setInfoMessage(`OTP dikirim ulang ke ${maskedDestination || 'tujuan terdaftar'}`);
                      } catch (error: any) {
                        setInfoMessage(error.response?.data?.message || error.message || 'Gagal kirim ulang OTP');
                      }
                    }}
                    className="self-center py-2"
                  >
                    <Text className="font-inter-bold text-sm text-primary">Kirim ulang OTP</Text>
                  </Pressable>
                </View>
              ) : null}

              {step === 'reset' ? (
                <View className="gap-3 mt-1">
                  <View className="bg-surface-container-low border border-outline-variant rounded-2xl p-3 gap-1.5">
                    <Text className="font-inter-bold text-xs text-on-surface mb-0.5">
                      Syarat Password Baru:
                    </Text>
                    {requirementItems.map((req) => (
                      <View key={req.key} className="flex-row items-center gap-2">
                        <Text className={`font-inter-bold text-xs ${req.met ? 'text-green-600' : 'text-text-muted'}`}>
                          {req.met ? '✓' : '○'}
                        </Text>
                        <Text className={`font-inter text-xs ${req.met ? 'text-green-700 font-inter-semibold' : 'text-text-muted'}`}>
                          {req.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Controller
                    control={resetForm.control}
                    name="new_password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Password baru"
                        placeholder="Masukkan password baru"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={resetForm.formState.errors.new_password?.message}
                        secureTextEntry
                      />
                    )}
                  />

                  <Controller
                    control={resetForm.control}
                    name="confirm_password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Konfirmasi password"
                        placeholder="Ulangi password baru"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={resetForm.formState.errors.confirm_password?.message}
                        secureTextEntry
                      />
                    )}
                  />

                  <Button
                    title="Simpan Password"
                    onPress={resetForm.handleSubmit((values) => resetMutation.mutate(values))}
                    loading={resetMutation.isPending}
                  />
                </View>
              ) : null}
            </View>

            <Pressable onPress={() => router.back()} className="self-center py-2">
              <Text className="font-inter-bold text-sm text-text-muted">Kembali ke login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

