import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Tokens } from '../src/core/theme/tokens';
import { filterVisitsByDescendants, findDescendantIds } from '../src/features/visit/hierarchy';
import { attendanceService } from '../src/services/attendance.service';
import { employeeService } from '../src/services/employee.service';
import { useAuthStore } from '../src/stores/auth.store';
import { VisitItem, VisitRequest } from '../src/types/attendance';

export default function VisitScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [modalVisible, setModalVisible] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [reason, setReason] = useState('');
  const [photoFile, setPhotoFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedVisitAction, setSelectedVisitAction] = useState<VisitItem | null>(null);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState<VisitItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'me' | 'team'>(params.tab === 'team' ? 'team' : 'me');

  // Preview Image State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const formatGpsAddress = (place: Location.LocationGeocodedAddress | null | undefined) => {
    if (!place) return null;
    return [
      place.street,
      place.streetNumber,
      place.district,
      place.subregion,
      place.region,
    ]
      .filter(Boolean)
      .join(', ');
  };

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

  useEffect(() => {
    if (params.tab === 'team' && subordinateIds.length > 0) {
      setActiveTab('team');
    }
  }, [params.tab, subordinateIds.length]);

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
  const fetchGps = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    setGpsAddress(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setGpsError('Izin akses lokasi ditolak. Buka pengaturan untuk mengaktifkan.');
        setGpsLoading(false);
        return;
      }

      let position = await Location.getLastKnownPositionAsync();
      const isFresh = position && (Date.now() - position.timestamp < 120000);

      if (!isFresh) {
        position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      if (position?.coords) {
        const nextCoords = { lat: position.coords.latitude, long: position.coords.longitude };
        setCoords(nextCoords);
        const places = await Location.reverseGeocodeAsync({
          latitude: nextCoords.lat,
          longitude: nextCoords.long,
        });
        const address = formatGpsAddress(places[0]);
        setGpsAddress(address);
        if (address && locationName.trim().length === 0) {
          setLocationName(address);
        }
      } else {
        throw new Error('Position not found');
      }
    } catch (err: any) {
      console.warn('GPS position query failed, trying fallback', err);
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          const nextCoords = { lat: lastKnown.coords.latitude, long: lastKnown.coords.longitude };
          setCoords(nextCoords);
          const places = await Location.reverseGeocodeAsync({
            latitude: nextCoords.lat,
            longitude: nextCoords.long,
          });
          const address = formatGpsAddress(places[0]);
          setGpsAddress(address);
          if (address && locationName.trim().length === 0) {
            setLocationName(address);
          }
        } else {
          setGpsError('Gagal mendapatkan lokasi. Pastikan GPS menyala.');
        }
      } catch {
        setGpsError('Gagal mendapatkan lokasi GPS.');
      }
    } finally {
      setGpsLoading(false);
    }
  }, [locationName]);

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Kamera Diperlukan', 'Harap berikan izin kamera untuk mengambil foto kunjungan.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.back,
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const photo = result.assets[0];
      setPhotoFile({
        uri: photo.uri,
        name: `visit_${Date.now()}.jpg`,
        mimeType: photo.mimeType ?? 'image/jpeg',
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal mengambil foto');
    }
  };

  // Auto load location when modal opens
  useEffect(() => {
    if (modalVisible) {
      fetchGps();
    }
  }, [fetchGps, modalVisible]);

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
      setGpsAddress(null);
      setPhotoFile(null);
      Alert.alert('Sukses', 'Laporan kunjungan dinas (visit) berhasil dikirim');
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Gagal mengirim laporan kunjungan';
      Alert.alert('Gagal', errMsg);
    }
  });

  const visitActionMutation = useMutation({
    mutationFn: ({ visitId, action, reason }: { visitId: string; action: 'APPROVE' | 'REJECT'; reason?: string }) => (
      action === 'APPROVE'
        ? attendanceService.approveVisit(visitId)
        : attendanceService.rejectVisit(visitId, reason ?? '')
    ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['visit-history', 'team', user?.company_id, user?.branch_id, selectedYear, selectedMonth] }),
        queryClient.refetchQueries({ queryKey: ['visit-history', 'team', user?.company_id, user?.branch_id, selectedYear, selectedMonth], type: 'active' }),
      ]);
      setSelectedVisitAction(null);
      setRejectReason('');
      Alert.alert('Sukses', variables.action === 'APPROVE' ? 'Visit berhasil disetujui' : 'Visit berhasil ditolak');
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Gagal memproses visit';
      Alert.alert('Gagal', errMsg);
    },
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
  const canSubmitReject = rejectReason.trim().length >= 2 && !!selectedVisitAction && !visitActionMutation.isPending;

  const handleApproveVisit = (item: VisitItem) => {
    Alert.alert(
      'Setujui Visit',
      `Setujui kunjungan ${item.employee?.name || item.employee?.full_name || 'karyawan ini'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui',
          onPress: () => visitActionMutation.mutate({ visitId: item.id, action: 'APPROVE' }),
        },
      ]
    );
  };

  const handleRejectVisit = (item: VisitItem) => {
    setSelectedVisitAction(item);
    setRejectReason('');
  };

  const renderVisitCard = ({ item }: { item: VisitItem }) => (
    <Pressable
      disabled={activeTab !== 'me'}
      onPress={() => {
        if (activeTab === 'me') {
          setSelectedVisitDetail(item);
        }
      }}
    >
      <GlassCard style={{ padding: 16, marginBottom: 16, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        {activeTab === 'team' && item.employee && (
          <View className="flex-row items-center flex-1 mr-2 mb-3" style={{ gap: 8 }}>
            <View className="w-9 h-9 rounded-2xl bg-primary/5 items-center justify-center">
              <Text className="font-manrope-bold text-primary text-xs">
                {(item.employee?.name || item.employee?.full_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-manrope-bold text-sm text-on-surface" numberOfLines={1}>
                {item.employee.name || item.employee.full_name || 'Tanpa Nama'}
              </Text>
              <Text className="font-inter-medium text-[10px] text-text-muted uppercase tracking-wider">
                {item.employee.nik || '-'}
              </Text>
            </View>
          </View>
        )}

        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            <Text className="font-manrope-bold text-sm text-on-surface" numberOfLines={1}>
              {item.location_name}
            </Text>
            <View className="flex-row items-center mt-1.5 gap-1.5">
              <MaterialIcons name="event" size={12} color={Tokens.colors.textMuted} />
              <Text className="font-inter text-[11px] text-text-muted">
                {item.visit_date} · {item.visit_time.substring(0, 5)}
              </Text>
            </View>
          </View>
          <StatusBadge label={item.status} type={getStatusType(item.status)} />
        </View>

        {activeTab === 'me' ? (
          <View className="my-2 py-2 border-t border-b border-black/5 gap-1.5">
            <Text className="font-inter text-xs text-text-muted" numberOfLines={2}>
              Tujuan: <Text className="font-inter-semibold text-on-surface">{item.reason}</Text>
            </Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="font-inter text-[11px] text-text-muted">
                {item.visit_photo_url ? 'Foto tersedia' : 'Tanpa foto'}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="font-inter-semibold text-[11px] text-primary">Lihat Detail</Text>
                <MaterialIcons name="chevron-right" size={16} color={Tokens.colors.primary} />
              </View>
            </View>
          </View>
        ) : (
          <View className="my-2 py-2 border-t border-b border-black/5 gap-1.5">
            <Text className="font-inter text-xs text-text-muted">
              Tujuan: <Text className="font-inter-semibold text-on-surface">{item.reason}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Lokasi: <Text className="font-inter-semibold text-on-surface">{item.location_name}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              GPS: <Text className="font-inter-semibold text-on-surface">{Number(item.gps_lat).toFixed(6)}, {Number(item.gps_long).toFixed(6)}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Foto: <Text className="font-inter-semibold text-on-surface">{item.visit_photo_url ? 'Tersedia' : 'Tidak ada'}</Text>
            </Text>
            {item.visit_photo_url ? (
              <View className="flex-row items-center mt-0.5">
                <Text className="font-inter text-xs text-text-muted">Preview: </Text>
                <Pressable
                  onPress={() => {
                    setPreviewUrl(item.visit_photo_url!);
                    setPreviewVisible(true);
                  }}
                >
                  <Text className="font-inter-semibold text-xs text-primary underline">
                    Lihat foto
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        {activeTab === 'team' && String(item.status || '').toUpperCase() === 'PENDING' ? (
          <View className="mt-4 flex-row gap-3">
            <Pressable
              className="flex-1 rounded-2xl border border-error bg-white px-4 py-3 items-center active:opacity-60"
              onPress={() => handleRejectVisit(item)}
              disabled={visitActionMutation.isPending}
            >
              <Text className="font-inter-bold text-sm text-error">Tolak</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-2xl bg-primary px-4 py-3 items-center active:opacity-60"
              onPress={() => handleApproveVisit(item)}
              disabled={visitActionMutation.isPending}
            >
              <Text className="font-inter-bold text-sm text-white">Setujui</Text>
            </Pressable>
          </View>
        ) : null}
      </GlassCard>
    </Pressable>
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
                          <Text className="font-inter text-[10px] text-text-muted mt-0.5">
                            {gpsAddress || 'GPS terkunci'}
                          </Text>
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
                  <Text className="font-inter-bold text-[12px] text-text mb-2 ml-1">Foto Kunjungan</Text>

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
                      <Text className="font-inter-bold text-sm text-primary">Ambil Foto</Text>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedVisitDetail}
        onRequestClose={() => setSelectedVisitDetail(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View className="flex-1 pr-4">
                <Text className="font-manrope-extrabold text-2xl text-primary">Detail Visit</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">
                  Informasi lengkap kunjungan Anda.
                </Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => setSelectedVisitDetail(null)}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            {selectedVisitDetail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-3">
                  <View className="rounded-2xl border border-black/5 bg-white p-4">
                    <Text className="font-manrope-bold text-base text-on-surface">{selectedVisitDetail.location_name}</Text>
                    <Text className="font-inter text-sm text-text-muted mt-1">
                      {selectedVisitDetail.visit_date} · {selectedVisitDetail.visit_time.substring(0, 5)}
                    </Text>
                    <View className="mt-3 self-start">
                      <StatusBadge label={selectedVisitDetail.status} type={getStatusType(selectedVisitDetail.status)} />
                    </View>
                  </View>

                  <View className="rounded-2xl border border-black/5 bg-white p-4 gap-2">
                    <Text className="font-inter text-xs text-text-muted">
                      Tujuan: <Text className="font-inter-semibold text-on-surface">{selectedVisitDetail.reason}</Text>
                    </Text>
                    <Text className="font-inter text-xs text-text-muted">
                      GPS: <Text className="font-inter-semibold text-on-surface">
                        {Number(selectedVisitDetail.gps_lat).toFixed(6)}, {Number(selectedVisitDetail.gps_long).toFixed(6)}
                      </Text>
                    </Text>
                    <Text className="font-inter text-xs text-text-muted">
                      Foto: <Text className="font-inter-semibold text-on-surface">{selectedVisitDetail.visit_photo_url ? 'Tersedia' : 'Tidak ada'}</Text>
                    </Text>
                    {selectedVisitDetail.visit_photo_url ? (
                      <Pressable
                        className="mt-1 self-start"
                        onPress={() => {
                          setPreviewUrl(selectedVisitDetail.visit_photo_url!);
                          setPreviewVisible(true);
                        }}
                      >
                        <Text className="font-inter-semibold text-xs text-primary underline">Lihat foto</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <View className="h-6" />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedVisitAction}
        onRequestClose={() => {
          if (!visitActionMutation.isPending) {
            setSelectedVisitAction(null);
            setRejectReason('');
          }
        }}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View className="flex-1 pr-4">
                <Text className="font-manrope-extrabold text-2xl text-primary">Tolak Visit</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Masukkan alasan penolakan visit.</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => {
                  if (!visitActionMutation.isPending) {
                    setSelectedVisitAction(null);
                    setRejectReason('');
                  }
                }}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <Input
              label="Alasan penolakan"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Minimal 2 karakter"
              multiline
              numberOfLines={3}
              style={{ height: 90, textAlignVertical: 'top', paddingTop: 12 }}
            />

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-4 items-center active:opacity-60"
                onPress={() => {
                  setSelectedVisitAction(null);
                  setRejectReason('');
                }}
                disabled={visitActionMutation.isPending}
              >
                <Text className="font-inter-bold text-sm text-text-muted">Batal</Text>
              </Pressable>
              <Button
                title="Kirim Penolakan"
                onPress={() => {
                  if (!selectedVisitAction || !canSubmitReject) return;
                  visitActionMutation.mutate({
                    visitId: selectedVisitAction.id,
                    action: 'REJECT',
                    reason: rejectReason.trim(),
                  });
                }}
                loading={visitActionMutation.isPending}
                disabled={!canSubmitReject}
                className="flex-1 bg-error h-14 rounded-2xl"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
