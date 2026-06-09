import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { Skeleton, SkeletonCard } from '../src/components/ui/Skeleton';
import { Tokens } from '../src/core/theme/tokens';
import { attendanceService } from '../src/services/attendance.service';

type LocationStatus = 'loading' | 'granted' | 'denied';
type CameraStatus = 'loading' | 'granted' | 'denied';

export default function AttendanceScanScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
  const [isMocked, setIsMocked] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const { width, height } = useWindowDimensions();

  const parseQrPayload = useCallback((raw: string) => {
    try {
      const json = JSON.parse(raw) as { qr_token?: string; branch_id?: string };
      if (json.qr_token && json.branch_id) return { qrToken: json.qr_token, branchId: json.branch_id };
    } catch {}
    const parts = raw.split(':');
    if (parts.length >= 2) return { qrToken: raw.trim(), branchId: parts[0].trim() };
    throw new Error('Format QR tidak valid');
  }, []);

  const requestLocationPermission = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setErrorMessage('Izinkan akses lokasi untuk melakukan check-in / check-out.');
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ lat: position.coords.latitude, long: position.coords.longitude });
        setIsMocked(position.mocked === true);
        setStatus('granted');
        return;
      } catch (err) {
        console.warn('getCurrentPositionAsync failed, trying fallback', err);
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setCoords({ lat: lastKnown.coords.latitude, long: lastKnown.coords.longitude });
          setIsMocked(lastKnown.mocked === true);
          setStatus('granted');
          return;
        }
      }

      setStatus('denied');
      setErrorMessage('Lokasi tidak tersedia. Pastikan GPS aktif lalu coba lagi.');
    } catch (err) {
      console.error(err);
      setStatus('denied');
      setErrorMessage('Gagal mengakses lokasi. Coba lagi atau buka pengaturan lokasi.');
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    const loadTodayRecord = async () => {
      try {
        const record = await attendanceService.getTodayRecord();
        setTodayRecord(record ?? null);
      } catch (err) {
        console.error(err);
        setTodayRecord(null);
      }
    };
    loadTodayRecord();
  }, []);

  useEffect(() => {
    const run = async () => {
      const permission = cameraPermission ?? (await requestCameraPermission());
      setCameraStatus(permission.granted ? 'granted' : 'denied');
    };
    run();
  }, [cameraPermission, requestCameraPermission]);

  const submitAttendance = useCallback(async (rawQrData: string) => {
    if (!coords) return;
    setSubmitting(true);
    setCheckinMessage(null);
    setErrorMessage(null);
    try {
      const hasCheckin = !!todayRecord?.checkin_time || !!todayRecord?.checkin_at;
      const hasCheckout = !!todayRecord?.checkout_time || !!todayRecord?.checkout_at;

      if (hasCheckin && hasCheckout) {
        setErrorMessage('Anda sudah check-in dan check-out hari ini.');
        return;
      }

      if (!hasCheckin) {
        const { qrToken, branchId } = parseQrPayload(rawQrData);
        const payload = {
          qr_token: qrToken,
          branch_id: branchId,
          gps_lat: coords.lat,
          gps_long: coords.long,
          device_fingerprint: 'local-dev-id',
          user_agent: 'expo-hris-mobile',
          device_os: 'android',
          device_model: 'expo-device',
          is_mock_location: isMocked,
          is_rooted: false,
          battery_level: null,
          screen_resolution: `${Math.round(width)}x${Math.round(height)}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          checkin_photo_url: '',
        };
        const result = await attendanceService.checkin(payload);
        setCheckinMessage(result.message ?? 'Check-in berhasil');
      } else {
        const result = await attendanceService.checkout({
          gps_lat: coords.lat,
          gps_long: coords.long,
        });
        setCheckinMessage(result.message ?? 'Check-out berhasil');
      }

      const latest = await attendanceService.getTodayRecord();
      setTodayRecord(latest ?? null);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? error?.message ?? 'Gagal memproses absensi');
    } finally {
      setSubmitting(false);
    }
  }, [coords, isMocked, height, parseQrPayload, todayRecord, width]);

  const handleRetryScanner = () => {
    setScanned(false);
    setErrorMessage(null);
    setCheckinMessage(null);
  };

  const hasCheckin = !!todayRecord?.checkin_time || !!todayRecord?.checkin_at;
  const hasCheckout = !!todayRecord?.checkout_time || !!todayRecord?.checkout_at;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/5" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/10" />

      {/* Header */}
      <View className="flex-row items-center px-5 py-4 z-10 justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
        >
          <MaterialIcons name="arrow-back" size={24} color={Tokens.colors.primary} />
        </Pressable>
        <Text className="font-manrope-extrabold text-xl text-primary flex-1 text-center mr-10">
          Attendance Scan
        </Text>
      </View>

      <View className="flex-1 px-5 items-center justify-center gap-4 z-10">
        {status === 'loading' && (
          <View className="w-full gap-3 items-center">
            <ActivityIndicator size="large" color={Tokens.colors.primary} className="mb-4" />
            <Text className="font-inter-medium text-sm text-text-muted">Mengambil lokasi GPS...</Text>
            <View className="w-full mt-4">
              <Skeleton height={20} width="60%" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <SkeletonCard />
            </View>
          </View>
        )}

        {status === 'denied' && (
          <View className="items-center gap-4 w-full bg-white rounded-3xl p-6 shadow-sm border border-white/80">
            <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-2">
              <MaterialIcons name="location-off" size={32} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary text-center">Akses Lokasi Ditolak</Text>
            <Text className="font-inter text-sm text-on-surface-variant text-center px-2">
              {errorMessage || 'Aplikasi memerlukan izin lokasi untuk melakukan absensi.'}
            </Text>
            <Button title="Buka Pengaturan" onPress={() => Linking.openSettings()} className="w-full mt-2" />
            <Button
              title="Coba Lagi"
              onPress={requestLocationPermission}
              className="w-full bg-white border border-primary/20"
              textStyle={{ color: Tokens.colors.primary }}
            />
          </View>
        )}

        {status === 'granted' && cameraStatus === 'denied' && (
          <View className="items-center gap-4 w-full bg-white rounded-3xl p-6 shadow-sm border border-white/80">
            <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-2">
              <MaterialIcons name="camera-alt" size={32} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary text-center">Izin Kamera Diperlukan</Text>
            <Text className="font-inter text-sm text-on-surface-variant text-center px-2">
              Harap berikan izin kamera untuk memindai QR code cabang Anda.
            </Text>
            <Button title="Beri Izin Kamera" onPress={requestCameraPermission} className="w-full mt-2" />
          </View>
        )}

        {status === 'granted' && cameraStatus === 'granted' && (
          <View className="items-center w-full gap-5">
            <View className="bg-white/80 rounded-2xl px-4 py-2.5 border border-white/90 shadow-sm flex-row items-center gap-2 mb-2">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="font-inter-semibold text-xs text-on-surface-variant">
                GPS Terkunci: {coords?.lat.toFixed(5)}, {coords?.long.toFixed(5)}
              </Text>
            </View>

            <View className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden border-[4px] border-primary-container/20 shadow-2xl relative">
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : ({ data }) => {
                  setScanned(true);
                  submitAttendance(data);
                }}
              />
              {!scanned && (
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <View className="w-48 h-48 border-2 border-dashed border-white/80 rounded-2xl" />
                  <View className="absolute left-1/2 top-12 w-[1px] h-40 bg-red-500 opacity-60" style={{ transform: [{ translateX: -0.5 }] }} />
                </View>
              )}
            </View>

            {hasCheckin && !hasCheckout && (
              <View className="bg-secondary-container/30 border border-secondary-container rounded-2xl p-3.5 w-full flex-row items-center gap-3 mt-2">
                <MaterialIcons name="info" size={20} color={Tokens.colors.primary} />
                <Text className="font-inter text-xs text-primary flex-1 leading-relaxed">
                  Status: Sudah Check In. Scan QR untuk melakukan <Text className="font-inter-bold">Check Out</Text>.
                </Text>
              </View>
            )}

            {hasCheckin && hasCheckout && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 w-full flex-row items-center gap-3 mt-2">
                <MaterialIcons name="check-circle" size={20} color="#059669" />
                <Text className="font-inter text-xs text-emerald-800 flex-1 leading-relaxed">
                  Anda telah menyelesaikan absensi hari ini (Sudah Check-In dan Check-Out).
                </Text>
              </View>
            )}

            {errorMessage && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 w-full flex-row items-start gap-3 mt-2">
                <MaterialIcons name="error" size={20} color={Tokens.colors.error} />
                <Text className="font-inter text-xs text-error flex-1 leading-relaxed">
                  {errorMessage}
                </Text>
              </View>
            )}

            {checkinMessage && (
              <View className="bg-[#d9e6da] border border-[#b2cfb5] rounded-2xl p-4 w-full flex-row items-start gap-3 mt-2">
                <MaterialIcons name="check-circle" size={20} color="#1f6b42" />
                <Text className="font-inter-semibold text-xs text-[#1f6b42] flex-1 leading-relaxed">
                  {checkinMessage}
                </Text>
              </View>
            )}

            {scanned && !submitting && (
              <Button
                title="Scan Ulang"
                onPress={handleRetryScanner}
                className="w-full mt-2 h-13 rounded-2xl bg-white border border-primary/25"
                textStyle={{ color: Tokens.colors.primary }}
              />
            )}

            {submitting && (
              <View className="flex-row items-center justify-center gap-2 w-full mt-2 py-3">
                <ActivityIndicator size="small" color={Tokens.colors.primary} />
                <Text className="font-inter-medium text-sm text-text-muted">Memproses absensi...</Text>
              </View>
            )}

            {!scanned && (
              <Text className="font-inter text-xs text-text-muted italic text-center mt-2 px-6">
                Arahkan kamera ke QR Code cabang untuk check-in atau check-out
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
