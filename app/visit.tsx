import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { PeriodSelector } from '../src/components/common/PeriodSelector';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { filterVisitsByDescendants, findDescendantIds } from '../src/features/visit/hierarchy';
import { Tokens } from '../src/core/theme/tokens';
import { attendanceService } from '../src/services/attendance.service';
import { employeeService } from '../src/services/employee.service';
import { useAuthStore } from '../src/stores/auth.store';
import { VisitItem, VisitRequest } from '../src/types/attendance';

export default function VisitScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const cameraRef = useRef<React.ElementRef<typeof CameraView> | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [reason, setReason] = useState('');
  const [photoFile, setPhotoFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Tab State
  const [activeTab, setActiveTab] = useState<'me' | 'team'>('me');

  // Preview Image State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // 1. Fetch Visit History
  const { data: history = [], isLoading: isLoadingMe, refetch: refetchMe, isFetching: isFetchingMe } = useQuery({
    queryKey: ['visit-history', 'me', user?.id, selectedYear, selectedMonth],
    queryFn: () => attendanceService.listVisits({ employee_id: user?.id, year: selectedYear, month: selectedMonth, limit: 50 }),
    enabled: !!user?.id,
  });

  const { data: hierarchy = [] } = useQuery({
    queryKey: ['employee-hierarchy', user?.company_id, user?.branch_id],
    queryFn: () => employeeService.getHierarchy({
      company_id: user?.company_id ?? undefined,
      branch_id: user?.branch_id ?? undefined,
    }),
    enabled: !!user?.id,
  });

  const subordinateIds = useMemo(
    () => (user?.id ? findDescendantIds(hierarchy, user.id) : []),
    [hierarchy, user?.id]
  );

  useEffect(() => {
    if (activeTab === 'team' && subordinateIds.length === 0) {
      setActiveTab('me');
    }
  }, [activeTab, subordinateIds.length]);

  // Fetch Team Visits
  const { data: teamVisitsRaw, isLoading: isLoadingTeam, refetch: refetchTeam, isFetching: isFetchingTeam } = useQuery({
    queryKey: ['visit-history', 'team', user?.company_id, user?.branch_id, selectedYear, selectedMonth],
    queryFn: () => attendanceService.listVisits({
      company_id: user?.company_id ?? undefined,
      branch_id: user?.branch_id ?? undefined,
      year: selectedYear,
      month: selectedMonth,
      limit: 50,
    }),
    enabled: subordinateIds.length > 0 && activeTab === 'team',
  });

  const teamVisits = useMemo(() => {
    if (!teamVisitsRaw) return [];
    return filterVisitsByDescendants(teamVisitsRaw, subordinateIds);
  }, [teamVisitsRaw, subordinateIds]);

  const currentData = activeTab === 'me' ? history : teamVisits;
  const isLoading = activeTab === 'me' ? isLoadingMe : isLoadingTeam;
  const isFetching = activeTab === 'me' ? isFetchingMe : isFetchingTeam;

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
      const permission = cameraPermission ?? (await requestCameraPermission());
      if (!permission.granted) {
        Alert.alert('Izin Kamera Diperlukan', 'Harap berikan izin kamera untuk mengambil foto kunjungan.');
        return;
      }
      setCameraVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal membuka kamera');
    }
  };

  const capturePhoto = async () => {
    try {
      const camera = cameraRef.current;
      if (!camera) return;
      const photo = await camera.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!photo?.uri) return;
      setPhotoFile({
        uri: photo.uri,
        name: `visit_${Date.now()}.jpg`,
        mimeType: photo.format === 'png' ? 'image/png' : 'image/jpeg',
      });
      setCameraVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal mengambil foto');
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
        queryClient.invalidateQueries({ queryKey: ['visit-history', 'me', user?.id, selectedYear, selectedMonth] }),
        queryClient.refetchQueries({ queryKey: ['visit-history', 'me', user?.id, selectedYear, selectedMonth], type: 'active' }),
      ]);
      setModalVisible(false);
      setLocationName('');
      setReason('');
      setCoords(null);
      setPhotoFile(null);
      Alert.alert('Sukses', 'Laporan kunjungan dinas (visit) berhasil dikirim');
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Gagal mengirim laporan kunjungan';
      Alert.alert('Gagal', errMsg);
    }
  });

  const onRefresh = () => {
    if (activeTab === 'me') {
      refetchMe();
    } else {
      refetchTeam();
    }
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

  const renderVisitCard = ({ item }: { item: VisitItem }) => (
    <GlassCard style={{ padding: 16, marginBottom: 16 }}>
      {activeTab === 'team' && item.employee && (
        <View className="mb-3 flex-row items-center gap-2 border-b border-black/5 pb-2">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Text className="font-manrope-bold text-primary text-xs">
              {(item.employee?.name || item.employee?.full_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-inter-bold text-sm text-black">{item.employee.name || item.employee.full_name || 'Tanpa Nama'}</Text>
            <Text className="font-inter text-[10px] text-text-muted">{item.employee.nik || '-'}</Text>
          </View>
        </View>
      )}

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
          <Pressable
            className="flex-row items-center gap-1 bg-primary/10 px-2 py-1 rounded-md active:opacity-60"
            onPress={() => {
              setPreviewUrl(item.visit_photo_url!);
              setPreviewVisible(true);
            }}
          >
            <MaterialIcons name="photo" size={12} color={Tokens.colors.primary} />
            <Text className="font-inter-bold text-[10px] text-primary">Lihat Foto</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-1 px-2 py-1 rounded-md">
            <MaterialIcons name="photo-camera" size={12} color={Tokens.colors.outline} />
            <Text className="font-inter-medium text-[10px] text-text-muted">Tanpa Foto</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-16 -right-20 w-72 h-72 rounded-full bg-primary/5" />
      <View className="absolute bottom-10 -left-24 w-80 h-80 rounded-full bg-secondary-container/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-primary">Kunjungan</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Daftar & laporan kunjungan</Text>
          </View>
        </View>
        <Pressable
          className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30 elevation-8"
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitCard}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
        ListHeaderComponent={() => (
          <View>

            <View className="mb-6">
              <PeriodSelector
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                title="FIlter Riwayat"
                subtitle="Riwayat kunjungan berdasarkan bulan dan tahun"
              />
            </View>

            {subordinateIds.length > 0 && (
              <View className="flex-row bg-black/5 p-1 rounded-xl mb-6">
                <Pressable
                  onPress={() => setActiveTab('me')}
                  className={`flex-1 items-center py-2.5 rounded-lg ${activeTab === 'me' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`font-inter-bold text-sm ${activeTab === 'me' ? 'text-primary' : 'text-text-muted'}`}>Riwayat Saya</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('team')}
                  className={`flex-1 items-center py-2.5 rounded-lg ${activeTab === 'team' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`font-inter-bold text-sm ${activeTab === 'team' ? 'text-primary' : 'text-text-muted'}`}>Riwayat Bawahan</Text>
                </Pressable>
              </View>
            )}

            <Text className="font-manrope-bold text-lg text-primary mb-4">
              {activeTab === 'team' ? 'Riwayat Visit Bawahan' : 'Riwayat Kunjungan Saya'}
            </Text>

            {isLoading && (
              <View className="mt-2">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            )}

            {!isLoading && currentData.length === 0 && (
              <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 8 }}>
                <MaterialIcons name="location-off" size={64} color={Tokens.colors.outline} />
                <Text className="font-manrope-bold text-lg text-primary mt-4 text-center">
                  Belum Ada Visit
                </Text>
                <Text className="font-inter-medium text-sm text-text-muted mt-2 text-center">
                  {activeTab === 'team' ? 'Belum ada riwayat kunjungan dari bawahan Anda.' : 'Belum ada riwayat kunjungan dinas (visit).'}
                </Text>
              </GlassCard>
            )}
          </View>
        )}
      />

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
              <View>
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
                      <Text className="font-inter-bold text-sm text-primary">Ambil Foto Langsung</Text>
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
                      photo: photoFile ? {
                        uri: photoFile.uri,
                        name: photoFile.name,
                        type: photoFile.mimeType,
                      } : null,
                    });
                  }}
                  loading={submitMutation.isPending}
                  disabled={!isFormValid}
                  className="bg-primary h-14 rounded-2xl"
                />
                <View className="h-10" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cameraVisible}
        onRequestClose={() => setCameraVisible(false)}
      >
        <View className="flex-1 bg-black">
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
          />
          <View className="absolute top-0 left-0 right-0 px-5 pt-16 flex-row items-center justify-between">
            <Pressable
              className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              onPress={() => setCameraVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </Pressable>
            <Text className="font-manrope-bold text-base text-white">Ambil Foto Kunjungan</Text>
            <View className="w-10" />
          </View>
          <View className="absolute bottom-12 left-0 right-0 items-center">
            <Pressable
              className="w-20 h-20 rounded-full bg-white items-center justify-center border-4 border-white/40"
              onPress={capturePhoto}
            >
              <View className="w-16 h-16 rounded-full bg-primary" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={previewVisible}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <Pressable
            className="absolute top-12 right-6 w-10 h-10 rounded-full bg-white/10 items-center justify-center z-10"
            onPress={() => setPreviewVisible(false)}
          >
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </Pressable>
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
