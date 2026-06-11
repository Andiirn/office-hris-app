import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { attendanceService } from '../src/services/attendance.service';
import { useAuthStore } from '../src/stores/auth.store';
import { VisitRequest } from '../src/types/attendance';

export default function VisitScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [reason, setReason] = useState('');
  const [photoFile, setPhotoFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // 1. Fetch Visit History
  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['visit-history', user?.id],
    queryFn: () => attendanceService.listVisits({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  // GPS fetch function
  const fetchGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setGpsError('Izin akses lokasi ditolak. Buka pengaturan untuk mengaktifkan.');
        setGpsLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: position.coords.latitude, long: position.coords.longitude });
    } catch (err: any) {
      console.warn('GPS position query failed, trying fallback', err);
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setCoords({ lat: lastKnown.coords.latitude, long: lastKnown.coords.longitude });
        } else {
          setGpsError('Gagal mendapatkan lokasi. Pastikan GPS menyala.');
        }
      } catch {
        setGpsError('Gagal mendapatkan lokasi GPS.');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;
      setPhotoFile(result.assets[0]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal mengambil gambar');
    }
  };

  // Auto load location when modal opens
  useEffect(() => {
    if (modalVisible) {
      fetchGps();
    }
  }, [modalVisible]);

  // 2. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: VisitRequest) => attendanceService.requestVisit(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['visit-history', user?.id] }),
        queryClient.refetchQueries({ queryKey: ['visit-history', user?.id], type: 'active' }),
      ]);
      setModalVisible(false);
      setLocationName('');
      setReason('');
      setCoords(null);
      setPhotoFile(null);
      Alert.alert('Sukses', 'Laporan kunjungan dinas (visit) berhasil dikirim');
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Gagal mengirim laporan visit';
      Alert.alert('Gagal', errMsg);
    }
  });

  const onRefresh = () => {
    refetch();
  };

  const getStatusType = (status: string) => {
    const raw = String(status).toUpperCase();
    if (raw === 'APPROVED') return 'secondary';
    if (raw === 'PENDING') return 'warning';
    return 'error'; // REJECTED, CANCELLED
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const isFormValid = locationName.trim().length >= 2 && reason.trim().length >= 5 && !!coords;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-16 -right-20 w-72 h-72 rounded-full bg-primary/5" />
      <View className="absolute bottom-10 -left-24 w-80 h-80 rounded-full bg-secondary-container/10" />


      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Visit</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Daftar & laporan kunjungan</Text>
        </View>
        <Pressable
          className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30 elevation-8"
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        <GlassCard style={{ padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: Tokens.colors.primary }}>
          <Text className="font-inter-bold text-sm text-black mb-2">Informasi Visit</Text>
          <Text className="font-inter text-xs text-text-muted leading-5">
            Gunakan fitur ini untuk melaporkan kehadiran saat bertugas atau melakukan kunjungan ke luar kantor/klien. Laporan Anda akan menyertakan koordinat lokasi saat pengiriman.
          </Text>
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4">Riwayat Kunjungan</Text>

        {isLoading ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 8 }}>
            <MaterialIcons name="location-off" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4 text-center">
              Belum Ada Visit
            </Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-2 text-center">
              Belum ada riwayat kunjungan dinas (visit).
            </Text>
            <Button title="Laporkan Visit Baru" onPress={() => setModalVisible(true)} style={{ marginTop: 16 }} />
          </GlassCard>
        ) : (
          <View className="gap-4">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="font-inter-bold text-base text-black" numberOfLines={1}>
                      {item.location_name}
                    </Text>
                    <View className="flex-row items-center mt-1.5 gap-1.5">
                      <MaterialIcons name="event" size={12} color={Tokens.colors.textMuted} />
                      <Text className="font-inter-medium text-xs text-text-muted">
                        {item.visit_date} · {item.visit_time.substring(0, 5)}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge label={item.status} type={getStatusType(item.status)} />
                </View>

                <View className="bg-black/5 p-3 rounded-xl mb-2">
                  <Text className="font-inter text-sm text-black leading-5">{item.reason}</Text>
                </View>

                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="map" size={12} color={Tokens.colors.textMuted} />
                    <Text className="font-inter text-[10px] text-text-muted tabular-nums">
                      GPS: {Number(item.gps_lat).toFixed(6)}, {Number(item.gps_long).toFixed(6)}
                    </Text>
                  </View>
                  {item.visit_photo_url ? (
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons name="photo" size={12} color={Tokens.colors.primary} />
                      <Text className="font-inter-bold text-[10px] text-primary">Foto Terlampir</Text>
                    </View>
                  ) : null}
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Submit Visit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Laporkan Visit</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Isi data kunjungan Anda</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Nama Lokasi"
                value={locationName}
                onChangeText={setLocationName}
                placeholder="Misal: Kantor PT Maju Jaya, Jaksel"
              />

              <Input
                label="Keterangan / Alasan Kunjungan"
                value={reason}
                onChangeText={setReason}
                placeholder="Tujuan kunjungan (minimal 5 karakter)..."
                multiline
                numberOfLines={3}
                style={{ height: 90, textAlignVertical: 'top', paddingTop: 12 }}
              />

              {/* GPS coordinates locking box */}
              <View className="mb-6">
                <Text className="font-inter-bold text-[12px] text-text mb-2 ml-1">Kunci Lokasi GPS</Text>
                <View className="bg-black/5 rounded-2xl p-4 flex-row items-center justify-between border border-black/5">
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <MaterialIcons
                      name={coords ? "location-on" : "location-searching"}
                      size={22}
                      color={coords ? Tokens.colors.primary : Tokens.colors.textMuted}
                    />
                    {gpsLoading ? (
                      <Text className="font-inter-medium text-sm text-text-muted">Mencari lokasi GPS...</Text>
                    ) : coords ? (
                      <View>
                        <Text className="font-inter-bold text-sm text-black tabular-nums">
                          {coords.lat.toFixed(6)}, {coords.long.toFixed(6)}
                        </Text>
                        <Text className="font-inter text-[10px] text-text-muted mt-0.5">GPS terkunci</Text>
                      </View>
                    ) : (
                      <View className="flex-1">
                        <Text className="font-inter-bold text-sm text-error" numberOfLines={2}>
                          {gpsError || 'Lokasi GPS belum didapatkan'}
                        </Text>
                        {gpsError?.includes('dinyalakan') || gpsError?.includes('ditolak') ? (
                          <Pressable onPress={handleOpenSettings} className="mt-1">
                            <Text className="font-inter-bold text-xs text-primary underline">Buka Pengaturan</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {!gpsLoading && (
                    <Pressable
                      onPress={fetchGps}
                      className="w-9 h-9 rounded-full bg-white items-center justify-center border border-black/5 shadow-sm active:opacity-60"
                    >
                      <MaterialIcons name="refresh" size={18} color={Tokens.colors.primary} />
                    </Pressable>
                  )}
                  {gpsLoading && (
                    <ActivityIndicator size="small" color={Tokens.colors.primary} />
                  )}
                </View>
              </View>

              {/* Photo Upload Section */}
              <View className="mb-6">
                <Text className="font-inter-bold text-[12px] text-text mb-2 ml-1">Foto Kunjungan (Opsional)</Text>

                {photoFile ? (
                  <View className="rounded-2xl overflow-hidden border border-black/10 relative">
                    <Image source={{ uri: photoFile.uri }} style={{ width: '100%', height: 160 }} />
                    <Pressable
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 items-center justify-center border border-white/20 active:opacity-60"
                      onPress={() => setPhotoFile(null)}
                    >
                      <MaterialIcons name="close" size={18} color="#ffffff" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={pickPhoto}
                    className="border border-dashed border-black/20 bg-black/5 rounded-2xl p-6 items-center justify-center flex-row gap-2 active:opacity-60"
                  >
                    <MaterialIcons name="photo-camera" size={20} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-sm text-primary">Ambil Foto / Pilih Gambar</Text>
                  </Pressable>
                )}
              </View>

              <Button
                title="Kirim Laporan Visit"
                onPress={() => {
                  if (!isFormValid) {
                    return;
                  }

                  const today = new Date().toISOString().slice(0, 10);
                  const currentTime = new Date().toTimeString().slice(0, 8);

                  submitMutation.mutate({
                    gps_lat: coords!.lat,
                    gps_long: coords!.long,
                    visit_date: today,
                    visit_time: currentTime,
                    reason: reason.trim(),
                    location_name: locationName.trim(),
                    visit_photo_url: photoFile ? `https://hris.javasuperfood.com/uploads/visits/visit_${user?.id}_${Date.now()}.jpg` : null
                  });
                }}
                loading={submitMutation.isPending}
                disabled={!isFormValid}
                className="bg-primary h-14 rounded-2xl"
              />
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
