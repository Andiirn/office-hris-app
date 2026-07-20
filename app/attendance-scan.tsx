import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { Skeleton, SkeletonCard } from '../src/components/ui/Skeleton';
import { getStableDeviceFingerprint } from '../src/core/auth/device-fingerprint';
import { qk } from '../src/core/query/query-keys';
import { Tokens } from '../src/core/theme/tokens';
import { parseAttendanceQrPayload } from '../src/features/attendance/qr';
import { getAttendanceScanDecision } from '../src/features/attendance/scan-state';
import { attendanceService, createSelfiePhotoCode } from '../src/services/attendance.service';
import { useAuthStore } from '../src/stores/auth.store';

type LocationStatus = 'loading' | 'granted' | 'denied';
type CameraStatus = 'loading' | 'granted' | 'denied';
type ScanMode = 'qr' | 'selfie';

type ScanFailure = {
  title: string;
  message: string;
  reasons: string[];
  mode: ScanMode;
};

type AttendanceRecordLike = {
  id?: string;
  attendance_date?: string;
  date?: string;
  checkin_at?: string | null;
  checkin_time?: string | null;
  checkout_at?: string | null;
  checkout_time?: string | null;
  attendance_status?: string;
  status?: string;
  attendance_method?: string;
  branch_name?: string | null;
  branch?: { name?: string | null } | null;
  created_at?: string | null;
};

const SELFIE_INFO_SEEN_KEY = 'attendance_scan_selfie_info_seen';
const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

const FRAUD_REASON_LABELS: Record<string, string> = {
  TAMPERED_TOKEN: 'Token selfie tidak valid atau berubah',
  HIGH_PRECISION_GPS: 'Presisi GPS belum cukup untuk verifikasi',
  OUTSIDE_RADIUS: 'Lokasi berada di luar radius cabang',
  EMULATOR_DETECTED: 'Perangkat terdeteksi sebagai emulator atau lingkungan virtual',
};

const normalizeErrorItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const candidate = (item as { message?: unknown; field?: unknown }).message;
        if (typeof candidate === 'string') return candidate;
      }
      return '';
    })
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatScanFailure = (error: any, mode: ScanMode): ScanFailure => {
  const response = error?.response?.data ?? {};
  const rawMessage = typeof response.message === 'string'
    ? response.message
    : typeof error?.message === 'string'
      ? error.message
      : 'Gagal memproses absensi';

  const embeddedFlags = rawMessage.includes(':')
    ? rawMessage
      .split(':')
      .slice(1)
      .join(':')
      .split(/[,\n]/)
      .map((item: string) => item.trim())
      .filter(Boolean)
    : [];

  const errorItems = [
    ...normalizeErrorItems(response.errors),
    ...normalizeErrorItems(response.detail),
  ];

  const flags = Array.from(new Set([...embeddedFlags, ...errorItems]));
  const isFraud = /anti-fraud|fraud/i.test(rawMessage) || flags.length > 0;

  if (!isFraud) {
    return {
      title: 'Gagal memproses absensi',
      message: rawMessage,
      reasons: [],
      mode,
    };
  }

  const formattedReasons = flags.length > 0
    ? flags.map((flag) => FRAUD_REASON_LABELS[flag] ?? flag)
    : [rawMessage];

  return {
    title: mode === 'selfie'
      ? 'Selfie ditolak sistem anti-fraud'
      : 'QR ditolak sistem anti-fraud',
    message: mode === 'selfie'
      ? 'Foto berhasil terkirim, tetapi server menolak absensi karena alasan berikut:'
      : 'QR berhasil dipindai, tetapi server menolak absensi karena alasan berikut:',
    reasons: formattedReasons,
    mode,
  };
};

const toSelfieUpload = (photo: CameraCapturedPicture, photoCode: string) => ({
  uri: photo.uri,
  name: `${photoCode}.${photo.format === 'png' ? 'png' : 'jpg'}`,
  type: photo.format === 'png' ? 'image/png' : 'image/jpeg',
});

const pickOpenAttendanceRecord = (records: AttendanceRecordLike[]) =>
  records.find((record) => !!record.checkin_at && !record.checkout_at) ?? null;

const getAttendanceIsLate = (record: AttendanceRecordLike | null | undefined) =>
  String(record?.attendance_status || record?.status || '').toUpperCase() === 'LATE';

const formatSuccessTime = (date = new Date()) =>
  `${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;


function SuccessResultScreen({
  message,
  successTime,
  isLate,
  onDone,
}: {
  message: string;
  successTime: string;
  isLate: boolean;
  onDone: () => void;
}) {
  const bubbles = [
    { left: 28, top: 28, delay: 0 },
    { left: 260, top: 40, delay: 120 },
    { left: 48, bottom: 80, delay: 240 },
    { right: 40, bottom: 92, delay: 360 },
  ];

  return (
    <View className="flex-1 bg-background px-5">
      <View className="absolute top-20 -right-16 w-72 h-72 rounded-full bg-primary/10" />
      <View className="absolute bottom-12 -left-20 w-80 h-80 rounded-full bg-secondary-container/40" />

      {bubbles.map((bubble, index) => (
        <MotiView
          key={`${bubble.left || bubble.right}-${index}`}
          from={{ opacity: 0, scale: 0.2, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 120, delay: bubble.delay }}
          style={[
            { position: 'absolute', width: 14, height: 14, borderRadius: 999, backgroundColor: Tokens.colors.primary },
            bubble,
          ]}
        />
      ))}

      <View className="flex-1 items-center justify-center">
        <MotiView
          from={{ opacity: 0, scale: 0.6, translateY: 18 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 160 }}
          className="items-center"
        >
          <MotiView
            from={{ scale: 0.8, opacity: 0.55 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ loop: true, type: 'timing', duration: 1200 }}
            className="absolute w-36 h-36 rounded-full bg-emerald-400/20"
          />
          <MotiView
            from={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ loop: true, repeatReverse: true, type: 'timing', duration: 1400 }}
            className="w-24 h-24 rounded-full bg-emerald-500 items-center justify-center shadow-lg mb-6"
          >
            <MaterialIcons name="check" size={54} color="#fff" />
          </MotiView>

          <Text className="font-manrope-extrabold text-4xl text-primary text-center">
            {successTime}
          </Text>
          <Text className="font-manrope-extrabold text-3xl text-primary text-center mt-1">
            Berhasil!
          </Text>
          <Text className="font-inter text-base text-on-surface-variant text-center mt-3 px-6 leading-6">
            {message}
          </Text>
          {isLate && (
            <View className="mt-4 rounded-full bg-error/10 px-4 py-2">
              <Text className="font-inter-bold text-sm text-error">
                Terlambat
              </Text>
            </View>
          )}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 250 }}
          className="w-full max-w-[320px] mt-10"
        >
          <Button
            title="Kembali ke Home"
            onPress={onDone}
            className="w-full h-14 rounded-2xl bg-primary"
            textStyle={{ color: '#ffffff', fontSize: 16 }}
          />
        </MotiView>
      </View>
    </View>
  );
}

function FailureResultScreen({
  title,
  message,
  reasons,
  onRetry,
}: {
  title: string;
  message: string;
  reasons: string[];
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 bg-background px-5">
      <View className="absolute top-20 -right-16 w-72 h-72 rounded-full bg-error/10" />
      <View className="absolute bottom-12 -left-20 w-80 h-80 rounded-full bg-primary/10" />

      <View className="flex-1 items-center justify-center">
        <MotiView
          from={{ opacity: 0, scale: 0.7, translateY: 18 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 150 }}
          className="items-center w-full max-w-[340px]"
        >
          <MotiView
            from={{ scale: 0.95 }}
            animate={{ scale: 1.05 }}
            transition={{ loop: true, repeatReverse: true, type: 'timing', duration: 900 }}
            className="w-24 h-24 rounded-full bg-error/10 items-center justify-center mb-6"
          >
            <MaterialIcons name="error" size={56} color={Tokens.colors.error} />
          </MotiView>

          <Text className="font-manrope-extrabold text-3xl text-error text-center">
            {title}
          </Text>
          <Text className="font-inter text-base text-on-surface-variant text-center mt-3 leading-6 px-4">
            {message}
          </Text>

          {!!reasons.length && (
            <View className="w-full mt-6 gap-3">
              {reasons.map((reason) => (
                <View key={reason} className="w-full rounded-2xl bg-white/80 px-4 py-3 border border-red-100">
                  <Text className="font-inter-semibold text-sm text-error text-center">
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 250 }}
            className="w-full mt-8"
          >
            <Button
              title="Coba Lagi"
              onPress={onRetry}
              className="w-full h-14 rounded-2xl bg-primary"
              textStyle={{ color: '#ffffff', fontSize: 16 }}
            />
          </MotiView>
        </MotiView>
      </View>
    </View>
  );
}

export default function AttendanceScanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cameraRef = useRef<React.ElementRef<typeof CameraView> | null>(null);
  const mockAlertShownRef = useRef(false);
  const { user } = useAuthStore();
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [successTime, setSuccessTime] = useState<string | null>(null);
  const [successIsLate, setSuccessIsLate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isMocked, setIsMocked] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecordLike[]>([]);
  const [isSelfieMode, setIsSelfieMode] = useState(false);
  const [scanFailure, setScanFailure] = useState<ScanFailure | null>(null);
  const { width, height } = useWindowDimensions();

  const submitSelfieAttendance = async () => {
    if (!coords) return;
    const scanMode: ScanMode = 'selfie';
    setSubmitting(true);
    setCheckinMessage(null);
    setSuccessTime(null);
    setSuccessIsLate(false);
    setErrorMessage(null);
    setScanFailure(null);

    try {
      const camera = cameraRef.current;
      if (!camera) {
        throw new Error('Kamera selfie belum siap');
      }

      const latestRecords = await attendanceService.getTodayRecords();
      setTodayRecords(latestRecords);

      const decision = getAttendanceScanDecision(latestRecords);
      if (decision.action === 'blocked') {
        setErrorMessage(decision.message);
        return;
      }

      const photoCode = createSelfiePhotoCode();
      const selfiePhoto = await camera.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (!selfiePhoto?.uri) {
        throw new Error('Gagal mengambil foto selfie');
      }

      const deviceFingerprint = await getStableDeviceFingerprint();
      const selfiePayload = {
        photoCode,
        lat: coords.lat,
        lng: coords.long,
        address: address || '',
        deviceID: deviceFingerprint,
        deviceModel: Device.modelName || Device.deviceName || 'unknown',
        timezoneID: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Math.floor(Date.now() / 1000),
      };
      const upload = toSelfieUpload(selfiePhoto, photoCode);

      if (decision.action === 'checkin') {
        const result = await attendanceService.checkinSelfie(selfiePayload, upload);
        setCheckinMessage(result?.message ?? 'Check-in selfie berhasil');
        setSuccessTime(formatSuccessTime());
      } else {
        const result = await attendanceService.checkoutSelfie(selfiePayload, upload);
        setCheckinMessage(result?.message ?? 'Check-out selfie berhasil');
        setSuccessTime(formatSuccessTime());
      }

      const latest = await attendanceService.getTodayRecords();
      setTodayRecords(latest);
      setSuccessIsLate(getAttendanceIsLate(latest.find((record) => record.checkin_at || record.checkout_at)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryRoot() }),
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryFullRoot() }),
        queryClient.invalidateQueries({ queryKey: qk.homeApprovals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: qk.activityAttendanceFeed(user?.id, null, null) }),
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryInfiniteRoot() }),
      ]);
    } catch (error: any) {
      setScanFailure(formatScanFailure(error, scanMode));
    } finally {
      setSubmitting(false);
    }
  };

  const requestLocationPermission = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    setCoords(null);
    setAddress(null);
    setIsMocked(false);
    mockAlertShownRef.current = false;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setErrorMessage('Izinkan akses lokasi untuk melakukan check-in / check-out.');
        return;
      }

      try {
        // Coba ambil lokasi terakhir (cache) terlebih dahulu
        let position = await Location.getLastKnownPositionAsync();
        // Cek apakah lokasi masih baru (misalnya kurang dari 2 menit / 120.000 ms)
        const isFresh = position && (Date.now() - position.timestamp < 120000);

        if (!isFresh) {
          // Jika lokasi sudah usang atau tidak ada, ambil lokasi baru
          // Menggunakan Balanced akan mempercepat penguncian lokasi karena mengombinasikan GPS, Wi-Fi, dan Seluler
          position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }

        if (position?.coords) {
          setCoords({ lat: position.coords.latitude, long: position.coords.longitude });
          setIsMocked(position.mocked === true);
          setStatus('granted');
          return;
        }
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
      setErrorMessage('Lokasi tidak tersedia. Pastikan GPS aktif, lalu coba lagi.');
    } catch (err) {
      console.error(err);
      setStatus('denied');
      setErrorMessage('Gagal mengakses lokasi. Coba lagi atau buka pengaturan lokasi.');
    }
  }, []);

  // useEffect(() => {
  //   if (status !== 'granted' || !isMocked || mockAlertShownRef.current) return;

  //   mockAlertShownRef.current = true;
  //   Alert.alert(
  //     'Mock location terdeteksi',
  //     'Matikan fake GPS atau developer mock location terlebih dahulu, lalu coba lagi untuk melanjutkan absensi.',
  //     [
  //       { text: 'Coba Lagi', onPress: requestLocationPermission },
  //       { text: 'OK', style: 'cancel' },
  //     ]
  //   );
  // }, [isMocked, requestLocationPermission, status]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    if (coords) {
      Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.long
      }).then(results => {
        if (results && results.length > 0) {
          const geocode = results[0];
          const parts = [
            geocode.name,
            geocode.street,
            geocode.streetNumber,
            geocode.district,
            geocode.city || geocode.subregion,
            geocode.region,
            geocode.postalCode
          ].filter(Boolean);
          const uniqueParts = parts.filter((item, pos) => parts.indexOf(item) === pos);
          setAddress(uniqueParts.join(', '));
        }
      }).catch(err => console.log('Reverse geocode failed', err));
    }
  }, [coords]);

  useEffect(() => {
    const loadTodayRecord = async () => {
      try {
        const records = await attendanceService.getTodayRecords();
        setTodayRecords(records);
      } catch (err) {
        console.error(err);
        setTodayRecords([]);
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
    const scanMode: ScanMode = 'qr';
    setSubmitting(true);
    setCheckinMessage(null);
    setSuccessTime(null);
    setSuccessIsLate(false);
    setErrorMessage(null);
    try {
      const { qrToken } = parseAttendanceQrPayload(rawQrData);
      const branchId = qrToken.split(':')[0];
      const latestRecords = await attendanceService.getTodayRecords();
      setTodayRecords(latestRecords);
      const decision = getAttendanceScanDecision(latestRecords);

      if (decision.action === 'blocked') {
        setErrorMessage(decision.message);
        return;
      }

      if (decision.action === 'checkout') {
        const result = await attendanceService.checkout({
          qr_token: qrToken,
          gps_lat: coords.lat,
          gps_long: coords.long,
          location_address: address || '',
          checkout_photo_url: '',
        });
        setCheckinMessage(result.message ?? 'Check-out berhasil');
        setSuccessTime(formatSuccessTime());
      } else {
        const deviceFingerprint = await getStableDeviceFingerprint();
        const qrPayload = {
          qr_token: qrToken,
          branch_id: branchId,
          gps_lat: coords.lat,
          gps_long: coords.long,
          location_address: address || '',
          device_fingerprint: deviceFingerprint,
          user_agent: `HRIS-Mobile/1.0.0/${Device.modelName || 'device'}`,
          device_os: Device.osName || 'unknown',
          device_model: Device.modelName || Device.deviceName || 'unknown',
          is_mock_location: isMocked,
          is_rooted: false,
          battery_level: null,
          screen_resolution: `${Math.round(width)}x${Math.round(height)}`,
          timezone: JAKARTA_TIME_ZONE,
        };
        const result = await attendanceService.checkin(qrPayload);
        setCheckinMessage(result.message ?? 'Check-in berhasil');
        setSuccessTime(formatSuccessTime());
      }
      const latest = await attendanceService.getTodayRecords();
      setTodayRecords(latest);
      setSuccessIsLate(getAttendanceIsLate(latest.find((record) => record.checkin_at || record.checkout_at)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryRoot() }),
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryFullRoot() }),
        queryClient.invalidateQueries({ queryKey: qk.homeApprovals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: qk.activityAttendanceFeed(user?.id, null, null) }),
        queryClient.invalidateQueries({ queryKey: qk.attendanceHistoryInfiniteRoot() }),
      ]);
    } catch (error: any) {
      setScanFailure(formatScanFailure(error, scanMode));
    } finally {
      setSubmitting(false);
    }
  }, [address, coords, height, isMocked, queryClient, user?.id, width]);

  const handleRetryScanner = () => {
    setScanned(false);
    setErrorMessage(null);
    setCheckinMessage(null);
    setSuccessTime(null);
    setScanFailure(null);
  };

  const handleModeChange = (mode: ScanMode) => {
    setIsSelfieMode(mode === 'selfie');
    setScanned(false);
    setCheckinMessage(null);
    setSuccessTime(null);
    setErrorMessage(null);
    setScanFailure(null);

    if (mode === 'selfie') {
      AsyncStorage.getItem(SELFIE_INFO_SEEN_KEY)
        .then((value) => {
          if (value === 'true') return;
          Alert.alert(
            'Info Mode Selfie',
            'Jika ingin menggunakan mode selfie, pastikan HRD sudah menugaskan Anda untuk menggunakannya terlebih dahulu.',
            [
              {
                text: 'Mengerti',
                onPress: () => {
                  AsyncStorage.setItem(SELFIE_INFO_SEEN_KEY, 'true').catch(() => { });
                },
              },
            ]
          );
        })
        .catch(() => { });
    }
  };

  const isScannerVisible =
    status === 'granted' &&
    cameraStatus === 'granted' &&
    !isMocked &&
    !scanned &&
    !checkinMessage &&
    !errorMessage &&
    !scanFailure;

  const hasSuccessState = !!checkinMessage && !errorMessage;
  const hasFailureState = !!errorMessage || !!scanFailure;
  const hasMockLocationState = status === 'granted' && isMocked;
  const failureTitle = scanFailure?.title ?? 'Gagal memproses absensi';
  const failureMessage = scanFailure?.message ?? errorMessage ?? 'Coba lagi untuk memproses absensi.';
  const failureReasons = scanFailure?.reasons ?? [];
  const openTodayRecord = pickOpenAttendanceRecord(todayRecords);
  const completedTodayRecords = todayRecords.filter((record) => !!record.checkin_at && !!record.checkout_at);
  const recordState = openTodayRecord
    ? 'open'
    : completedTodayRecords.length > 0
      ? 'completed'
      : 'none';

  if (hasSuccessState) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <SuccessResultScreen
          message={checkinMessage || 'Check-in berhasil'}
          successTime={successTime || formatSuccessTime()}
          isLate={successIsLate}
          onDone={() => router.replace('/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  if (hasFailureState) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <FailureResultScreen
          title={failureTitle}
          message={failureMessage}
          reasons={failureReasons}
          onRetry={handleRetryScanner}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/5" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/10" />

      <View className="flex-row items-center px-5 py-4 z-10 justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
        >
          <MaterialIcons name="arrow-back" size={24} color={Tokens.colors.primary} />
        </Pressable>
        <Text className="font-manrope-extrabold text-xl text-primary flex-1 text-center mr-10">
          Silahkan Scan QR Code / Wajah Anda
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
            <Button title="Coba Lagi" onPress={requestLocationPermission} className="w-full mt-2" />
          </View>
        )}

        {hasMockLocationState && (
          <View className="items-center gap-4 w-full bg-white rounded-3xl p-6 shadow-sm border border-red-200">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-2">
              <MaterialIcons name="gps-not-fixed" size={32} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-error text-center">Fake GPS Terdeteksi</Text>
            <Text className="font-inter text-sm text-on-surface-variant text-center px-2">
              Matikan fake GPS atau lokasi palsu terlebih dahulu, lalu coba lagi.
            </Text>
            <Button title="Coba Lagi" onPress={requestLocationPermission} className="w-full mt-2" />
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
            {!isSelfieMode ? (
              <View className="w-full max-w-[320px] rounded-2xl bg-white/80 px-4 py-3 border border-white/90 shadow-sm">
                <Text className="font-inter-bold text-[10px] text-primary uppercase tracking-wider">Lokasi Saat Ini</Text>
                <Text className="font-inter text-xs text-on-surface-variant mt-1 leading-5">
                  {address || 'Mengambil lokasi jalan...'}
                </Text>
              </View>
            ) : null}

            {isScannerVisible && (
              <>
                {!isSelfieMode ? (
                  <View className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden border-[4px] border-primary-container/20 shadow-2xl relative">
                    <CameraView
                      style={{ flex: 1 }}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={scanned ? undefined : ({ data }) => {
                        setScanned(true);
                        submitAttendance(data);
                      }}
                    />
                    <View className="absolute inset-0 items-center justify-center pointer-events-none">
                      <View className="w-48 h-48 border-2 border-dashed border-white/80 rounded-2xl" />
                      <View className="absolute left-1/2 top-12 w-[1px] h-40 bg-red-500 opacity-60" style={{ transform: [{ translateX: -0.5 }] }} />
                    </View>
                  </View>
                ) : (
                  <View className="w-full aspect-[3/4] rounded-3xl overflow-hidden border-[4px] border-primary-container/20 shadow-2xl relative bg-black">
                    <CameraView
                      ref={cameraRef}
                      style={{ flex: 1 }}
                      facing="front"
                    />
                    {submitting && (
                      <View className="absolute inset-0 items-center justify-center bg-black/45">
                        <View className="items-center rounded-3xl bg-white/92 px-5 py-4 shadow-lg">
                          <ActivityIndicator size="large" color={Tokens.colors.primary} />
                          <Text className="font-inter-bold text-sm text-primary mt-3 text-center">
                            Mengirim payload selfie
                          </Text>
                        </View>
                      </View>
                    )}
                    <View className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-xl border border-white/30">
                      <Text className="font-inter text-xs text-white/90 leading-relaxed">
                        {address ? `${address}\n` : ''}Lat: {coords?.lat.toFixed(6)}, Long: {coords?.long.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                )}

                <Text className="font-inter text-xs text-text-muted italic text-center mt-2 px-6">
                  {!isSelfieMode
                    ? 'Arahkan kamera ke QR Code cabang untuk check-in atau check-out'
                    : 'Posisikan wajah Anda di kamera, lalu tekan tombol foto di bawah.'}
                </Text>

                <View className="flex-row items-center justify-center mt-2 gap-4 w-full">
                  <Pressable
                    onPress={() => handleModeChange('qr')}
                    className={`flex-1 py-3 rounded-xl border items-center ${!isSelfieMode ? 'bg-primary border-primary' : 'bg-transparent border-primary/20'}`}
                  >
                    <Text className={`font-inter-bold text-sm ${!isSelfieMode ? 'text-white' : 'text-primary'}`}>Scan QR</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleModeChange('selfie')}
                    className={`flex-1 py-3 rounded-xl border items-center ${isSelfieMode ? 'bg-primary border-primary' : 'bg-transparent border-primary/20'}`}
                  >
                    <Text className={`font-inter-bold text-sm ${isSelfieMode ? 'text-white' : 'text-primary'}`}>Foto Selfie</Text>
                  </Pressable>
                </View>

                {isSelfieMode && (
                  <Pressable
                    disabled={submitting}
                    onPress={submitSelfieAttendance}
                    className={`w-16 h-16 rounded-full items-center justify-center shadow-lg mt-2 ${submitting ? 'bg-primary/50' : 'bg-primary'}`}
                  >
                    <MaterialIcons name="camera-alt" size={28} color="white" />
                  </Pressable>
                )}
              </>
            )}

          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
