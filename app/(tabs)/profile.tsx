import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Button } from '../../src/components/ui/Button';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Input } from '../../src/components/ui/Input';
import { Tokens } from '../../src/core/theme/tokens';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: any) => authService.updatePassword(payload),
    onSuccess: () => {
      Alert.alert('Sukses', 'Password berhasil diubah.');
      setModalVisible(false);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    },
    onError: (error: any) => {
      Alert.alert('Gagal', error?.response?.data?.message || 'Gagal mengubah password.');
    }
  });

  const handleChangePassword = () => {
    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      Alert.alert('Error', 'Harap isi semua kolom password.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      Alert.alert('Error', 'Password baru minimal 6 karakter.');
      return;
    }
    changePasswordMutation.mutate({
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    });
  };

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const displayName = profile?.full_name || user?.full_name || 'Employee';
  const displayNik = profile?.nik || user?.nik || '-';
  const displayEmail = profile?.email || '-';
  const displayPhone = profile?.phone || '-';
  const displayBranch = profile?.branch_name || '-';
  const displayDepartment = profile?.department_name || '-';
  const displayPosition = profile?.position_name || '-';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Background Decor */}
      <View className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/10" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-4 border-white shadow-sm mb-4">
            <MaterialIcons name="person" size={56} color={Tokens.colors.primary} />
          </View>
          <Text className="font-manrope-extrabold text-2xl text-primary">{displayName}</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-1">NIK: {displayNik}</Text>
          <View className="bg-secondary-container px-4 py-1.5 rounded-full mt-3">
            <Text className="font-inter-bold text-[10px] text-on-secondary-container uppercase tracking-widest">{displayPosition}</Text>
          </View>
        </View>

        <Text className="font-manrope-bold text-lg text-primary mb-4 ml-1">Personal Info</Text>
        <GlassCard style={{ padding: 0, marginBottom: 24 }}>
          {[
            { icon: 'email', label: 'Email', value: displayEmail },
            { icon: 'phone', label: 'Phone', value: displayPhone },
            { icon: 'location-on', label: 'Branch', value: displayBranch },
            { icon: 'work', label: 'Department', value: displayDepartment },
          ].map((item, idx, arr) => (
            <View key={item.label} className={`flex-row items-center p-4 ${idx !== arr.length - 1 ? 'border-b border-black/5' : ''}`}>
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name={item.icon as any} size={18} color={Tokens.colors.primary} />
              </View>
              <View>
                <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider">{item.label}</Text>
                <Text className="font-inter-bold text-sm text-black mt-0.5">{item.value}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4 ml-1">Keamanan</Text>
        <GlassCard style={{ padding: 0, marginBottom: 24 }}>
          <Pressable 
            className="flex-row items-center justify-between p-4"
            onPress={() => setModalVisible(true)}
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name="lock" size={18} color={Tokens.colors.primary} />
              </View>
              <View>
                <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider">Password</Text>
                <Text className="font-inter-bold text-sm text-black mt-0.5">Ganti Password</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.outline} />
          </Pressable>
        </GlassCard>

        <Pressable
          className="flex-row items-center justify-center bg-error-container p-4 rounded-2xl border border-error/10"
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color={Tokens.colors.error} />
          <Text className="font-inter-bold text-sm text-error ml-2">Keluar</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
        }}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <MotiView 
            from={{ translateY: 400 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="bg-background rounded-t-[32px] p-6 pb-12 shadow-2xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Ganti Password</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => {
                  setModalVisible(false);
                  setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
                }}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <Input
              label="Password Saat Ini"
              placeholder="Masukkan password saat ini"
              secureTextEntry
              value={passwordForm.old_password}
              onChangeText={(t) => setPasswordForm(p => ({ ...p, old_password: t }))}
              containerStyle={{ marginBottom: 16 }}
            />
            <Input
              label="Password Baru"
              placeholder="Masukkan password baru"
              secureTextEntry
              value={passwordForm.new_password}
              onChangeText={(t) => setPasswordForm(p => ({ ...p, new_password: t }))}
              containerStyle={{ marginBottom: 16 }}
            />
            <Input
              label="Konfirmasi Password Baru"
              placeholder="Ulangi password baru"
              secureTextEntry
              value={passwordForm.confirm_password}
              onChangeText={(t) => setPasswordForm(p => ({ ...p, confirm_password: t }))}
              containerStyle={{ marginBottom: 24 }}
            />

            <Button
              title="Simpan Password"
              onPress={handleChangePassword}
              loading={changePasswordMutation.isPending}
            />
          </MotiView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
