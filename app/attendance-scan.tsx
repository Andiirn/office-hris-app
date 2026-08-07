import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { Skeleton, SkeletonCard } from '../src/components/ui/Skeleton';
import { getStableDeviceFingerprint } from '../src/core/auth/device-fingerprint';
import { qk } from '../src/core/query/query-keys';
import { Tokens } from '../src/core/theme/tokens';
import { parseAttendanceQrPayload } from '../src/features/attendance/qr';
import { getAttendanceScanDecisionForToday } from '../src/features/attendance/scan-state';
import { attendanceService, createSelfiePhotoCode } from '../src/services/attendance.service';
import { authService } from '../src/services/auth.service';
import { EmpAssignmentService, EmpStoreAssignment, EmpStoreShift } from '../src/services/emp-assignment.service';
import { ProfileData } from '../src/types/profile';
import { useAuthStore } from '../src/stores/auth.store';
import { goBackOrTabs } from '../src/utils/navigation';

type LocationStatus = 'loading' | 'granted' | 'denied';
type CameraStatus = 'loading' | 'granted' | 'denied';
type ScanMode = 'qr' | 'selfie';

type ScanFailure = {
  title: string;
  message: string;
  reasons: string[];
  mode: ScanMode;
  actionLabel: string;
  actionHint?: string;
  tone?: 'success' | 'guidance' | 'security';
};

const FRAUD_REASON_LABELS: Record<string, string> = {
  TAMPERED_TOKEN: 'Token selfie tidak valid atau berubah',
  HIGH_PRECISION_GPS: 'Presisi GPS belum cukup untuk verifikasi',
  OUTSIDE_RADIUS: 'Lokasi berada di luar radius cabang',
  EMULATOR_DETECTED: 'Perangkat terdeteksi sebagai emulator atau lingkungan virtual',
  MOCK_LOCATION: 'Lokasi palsu / mock location terdeteksi',
  QR_REPLAY: 'QR sudah pernah dipakai. Tekan refresh QR di tablet lalu scan ulang.',
  QR_EXPIRED: 'QR sudah kedaluwarsa. Tekan refresh QR di tablet lalu scan ulang.',
};

const LOCATION_FLAGS = new Set(['OUTSIDE_RADIUS', 'HIGH_PRECISION_GPS', 'MOCK_LOCATION']);
const GUIDANCE_FLAGS = new Set(['QR_REPLAY', 'QR_EXPIRED']);
const SECURITY_FLAGS = new Set(['TAMPERED_TOKEN', 'EMULATOR_DETECTED', 'MOCK_LOCATION']);

const DEFAULT_FALLBACK_SHIFTS: EmpStoreShift[] = [
  { id: 'pagi', name: 'Pagi', code: 'PAGI' },
  { id: 'siang', name: 'Siang', code: 'SIANG' },
  { id: 'malam', name: 'Malam', code: 'MALAM' },
];

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

const isLocationRelatedFlag = (flag: string) => LOCATION_FLAGS.has(flag);

const isLocationRelatedFailure = (failure: ScanFailure | null) =>
  !!failure?.reasons?.some((reason) =>
    /lokasi berada di luar radius cabang|presisi gps belum cukup untuk verifikasi|lokasi palsu/i.test(reason)
  );

const getFailureActionLabel = (failure: ScanFailure | null) =>
  isLocationRelatedFailure(failure) ? 'Dapatkan Lokasi Tinggi' : 'Coba Lagi';

const getFailureTone = (flags: string[], rawMessage: string): NonNullable<ScanFailure['tone']> => {
  if (flags.some((flag) => SECURITY_FLAGS.has(flag))) return 'security';
  if (flags.some((flag) => GUIDANCE_FLAGS.has(flag))) return 'guidance';
  if (/sudah lengkap|Anda baru saja check-in|silakan tunggu/i.test(rawMessage)) return 'guidance';
  return 'security';
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

  const flags = Array.from(new Set([...embeddedFlags, ...errorItems]))
    .map((flag) => String(flag).trim().toUpperCase())
    .filter(Boolean);
  const isFraud = /anti-fraud|fraud/i.test(rawMessage) || flags.length > 0;

  if (!isFraud) {
    return {
      title: 'Gagal memproses absensi',
      message: rawMessage,
      reasons: [],
      mode,
      actionLabel: 'Coba Lagi',
    };
  }

  const formattedReasons = flags.length > 0
    ? flags.map((flag) => FRAUD_REASON_LABELS[flag] ?? flag)
    : [rawMessage];
  const isLocationIssue = flags.some(isLocationRelatedFlag);
  const tone = getFailureTone(flags, rawMessage);

  return {
    title: isLocationIssue
      ? 'Lokasi belum valid'
      : tone === 'guidance'
        ? 'Perlu tindakan'
        : mode === 'selfie'
          ? 'Selfie ditolak sistem anti-fraud'
          : 'QR ditolak sistem anti-fraud',
    message: isLocationIssue
      ? 'Lokasi yang terdeteksi belum memenuhi syarat absensi. Coba ambil lokasi yang lebih akurat.'
      : tone === 'guidance'
        ? 'Ikuti instruksi di bawah agar absensi bisa diproses dengan benar.'
        : mode === 'selfie'
          ? 'Foto berhasil terkirim, tetapi server menolak absensi karena alasan berikut:'
          : 'QR berhasil dipindai, tetapi server menolak absensi karena alasan berikut:',
    reasons: formattedReasons,
    mode,
    actionLabel: isLocationIssue ? 'Ambil Lokasi Lebih Akurat' : tone === 'guidance' ? 'Ikuti Instruksi' : 'Coba Lagi',
    actionHint: isLocationIssue
      ? 'Gunakan tombol ini untuk memaksa ambil ulang lokasi dengan presisi lebih tinggi.'
      : undefined,
    tone,
  };
};

const toSelfieUpload = (photo: CameraCapturedPicture, photoCode: string) => ({
  uri: photo.uri,
  name: `${photoCode}.${photo.format === 'png' ? 'png' : 'jpg'}`,
  type: photo.format === 'png' ? 'image/png' : 'image/jpeg',
});

const getAttendanceIsLate = (record: { attendance_status?: string | null; status?: string | null } | null | undefined) =>
  String(record?.attendance_status || record?.status || '').toUpperCase() === 'LATE';

const formatSuccessTime = (date = new Date()) =>
  `${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ${Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Jakarta'
    ? 'WIB'
    : Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Makassar'
      ? 'WITA'
      : Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Jayapura'
        ? 'WIT'
        : Intl.DateTimeFormat().resolvedOptions().timeZone}`;

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = (date = new Date()) => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  return getLocalDateString(prev);
};

const isSelfieCategory = (value?: string | null) =>
  value !== null && value !== undefined && String(value).trim() !== '';


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
  actionLabel,
  actionHint,
  tone = 'security',
  onRetry,
}: {
  title: string;
  message: string;
  reasons: string[];
  actionLabel: string;
  actionHint?: string;
  tone?: 'success' | 'guidance' | 'security';
  onRetry: () => void;
}) {
  const theme =
    tone === 'guidance'
      ? {
        accent: Tokens.colors.primary,
        accentSoft: 'bg-primary/10',
        accentSoft2: 'bg-primary/5',
        ring: 'border-primary/20',
        icon: 'info',
        iconBg: 'bg-primary/10',
        reasonBorder: 'border-primary/15',
        reasonBg: 'bg-white/85',
        titleClass: 'text-primary',
        actionClass: 'bg-primary',
      }
      : tone === 'success'
        ? {
          accent: '#1f6b42',
          accentSoft: 'bg-emerald-500/10',
          accentSoft2: 'bg-emerald-500/5',
          ring: 'border-emerald-500/20',
          icon: 'check-circle',
          iconBg: 'bg-emerald-500/10',
          reasonBorder: 'border-emerald-200',
          reasonBg: 'bg-emerald-50/70',
          titleClass: 'text-emerald-700',
          actionClass: 'bg-emerald-600',
        }
        : {
          accent: Tokens.colors.error,
          accentSoft: 'bg-error/10',
          accentSoft2: 'bg-primary/10',
          ring: 'border-error/20',
          icon: 'error',
          iconBg: 'bg-error/10',
          reasonBorder: 'border-red-100',
          reasonBg: 'bg-white/80',
          titleClass: 'text-error',
          actionClass: 'bg-primary',
        };

  return (
    <View className="flex-1 bg-background px-5">
      <View className={`absolute top-20 -right-16 w-72 h-72 rounded-full ${theme.accentSoft}`} />
      <View className={`absolute bottom-12 -left-20 w-80 h-80 rounded-full ${theme.accentSoft2}`} />

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
            className={`w-24 h-24 rounded-full ${theme.iconBg} items-center justify-center mb-6`}
          >
            <MaterialIcons name={theme.icon as any} size={56} color={theme.accent} />
          </MotiView>

          <Text className={`font-manrope-extrabold text-3xl text-center ${theme.titleClass}`}>
            {title}
          </Text>
          <Text className="font-inter text-base text-on-surface-variant text-center mt-3 leading-6 px-4">
            {message}
          </Text>
          {actionHint ? (
            <Text className="font-inter text-xs text-text-muted text-center mt-2 leading-5 px-4">
              {actionHint}
            </Text>
          ) : null}

          {!!reasons.length && (
            <View className="w-full mt-6 gap-3">
              {reasons.map((reason) => (
                <View key={reason} className={`w-full rounded-2xl px-4 py-3 border ${theme.reasonBg} ${theme.reasonBorder}`}>
                  <Text className="font-inter-semibold text-sm text-center" style={{ color: theme.accent }}>
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
              title={actionLabel}
              onPress={onRetry}
              className={`w-full h-14 rounded-2xl ${theme.actionClass}`}
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
  const [scanFailure, setScanFailure] = useState<ScanFailure | null>(null);
  const [selfieAssignment, setSelfieAssignment] = useState<EmpStoreAssignment | null>(null);
  const [selfieAssignmentLoading, setSelfieAssignmentLoading] = useState(false);
  const [selfieAssignmentError, setSelfieAssignmentError] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [assignmentReloadTick, setAssignmentReloadTick] = useState(0);
  const { width, height } = useWindowDimensions();
  const { data: fetchedProfile } = useQuery({
    queryKey: qk.profile(),
    queryFn: () => authService.getProfile(),
    staleTime: 1000 * 60 * 5,
    enabled: !!user?.id,
  });
  const cachedProfile = queryClient.getQueryData<ProfileData>(qk.profile());
  const selfieCategory = fetchedProfile?.employee_category ?? cachedProfile?.employee_category ?? user?.employee_category ?? null;
  const hasSelfieCategory = isSelfieCategory(selfieCategory);
  const [scanMode, setScanMode] = useState<ScanMode>(hasSelfieCategory ? 'selfie' : 'qr');
  const rawSelfieShifts = selfieAssignment?.store?.shifts ?? [];
  const selfieShifts = rawSelfieShifts.length > 0 ? rawSelfieShifts : DEFAULT_FALLBACK_SHIFTS;
  const selectedShift = selfieShifts.find((shift) => shift.id === selectedShiftId) ?? selfieShifts[0] ?? null;

  useEffect(() => {
    setScanMode(hasSelfieCategory ? 'selfie' : 'qr');
  }, [hasSelfieCategory]);

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

      const today = getLocalDateString();
      const yesterday = getYesterdayDateString();
      const [openRecord, todayRecords] = await Promise.all([
        attendanceService.getTodayRecord(),
        attendanceService.getAttendanceHistory({
          employee_id: user?.id,
          date_from: today,
          date_to: today,
          limit: 20,
          page: 1,
        }),
      ]);
      const yesterdayRecords = await attendanceService.getAttendanceHistory({
        employee_id: user?.id,
        date_from: yesterday,
        date_to: yesterday,
        limit: 20,
        page: 1,
      });
      const decision = getAttendanceScanDecisionForToday(openRecord, todayRecords, today, new Date(), yesterdayRecords);

      if (decision.action === 'blocked') {
        const isCooldown = /baru saja check-in/i.test(decision.message);
        setScanFailure({
          title: isCooldown ? 'Tunggu Sebentar' : 'Presensi Hari Ini Selesai',
          message: decision.message,
          reasons: [],
          mode: scanMode,
          actionLabel: isCooldown ? 'Tunggu Sebentar' : 'Mengerti',
          tone: isCooldown ? 'guidance' : 'success',
        });
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
        selected_shift_id: selectedShift?.id || null,
      };
      const upload = toSelfieUpload(selfiePhoto, photoCode);

      if (decision.action !== 'checkout') {
        const result = await attendanceService.checkinSelfie(selfiePayload, upload);
        setCheckinMessage(result?.message ?? 'Check-in selfie berhasil');
        setSuccessTime(formatSuccessTime());
      } else {
        const result = await attendanceService.checkoutSelfie(selfiePayload, upload);
        setCheckinMessage(result?.message ?? 'Check-out selfie berhasil');
        setSuccessTime(formatSuccessTime());
      }

      const latest = await attendanceService.getTodayRecord();
      setSuccessIsLate(getAttendanceIsLate(latest));
      queryClient.setQueryData(['attendance-open-checkin', user?.id], latest ?? null);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['attendance-open-checkin', user?.id], exact: true }),
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

  const requestLocationPermission = useCallback(async (accuracy: Location.LocationAccuracy = Location.Accuracy.Balanced) => {
    setStatus('loading');
    setErrorMessage(null);
    setCoords(null);
    setAddress(null);
    setIsMocked(false);
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
          // Default tetap Balanced; High dipakai hanya saat user minta retry lokasi lebih akurat.
          position = await Location.getCurrentPositionAsync({ accuracy });
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
        await attendanceService.getTodayRecord();
      } catch (err) {
        console.error(err);
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

  useEffect(() => {
    if (!hasSelfieCategory || !user?.id) {
      setSelfieAssignment(null);
      setSelfieAssignmentError(null);
      setSelfieAssignmentLoading(false);
      setSelectedShiftId(null);
      return;
    }

    let cancelled = false;

    const loadAssignment = async () => {
      setSelfieAssignmentLoading(true);
      setSelfieAssignmentError(null);

      try {
        const assignment = await EmpAssignmentService.getActiveStoreAssignmentByEmployeeId(user.id);
        if (cancelled) return;
        setSelfieAssignment(assignment);
        setSelectedShiftId((current) => current ?? assignment?.store?.shifts?.[0]?.id ?? null);
      } catch (error: any) {
        if (cancelled) return;
        setSelfieAssignment(null);
        setSelfieAssignmentError(error?.response?.data?.message || error?.message || 'Gagal memuat assignment selfie');
      } finally {
        if (!cancelled) setSelfieAssignmentLoading(false);
      }
    };

    loadAssignment();

    return () => {
      cancelled = true;
    };
  }, [assignmentReloadTick, hasSelfieCategory, user?.id]);

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
      const today = getLocalDateString();
      const yesterday = getYesterdayDateString();
      const [openRecord, todayRecords] = await Promise.all([
        attendanceService.getTodayRecord(),
        attendanceService.getAttendanceHistory({
          employee_id: user?.id,
          date_from: today,
          date_to: today,
          limit: 20,
          page: 1,
        }),
      ]);
      const yesterdayRecords = await attendanceService.getAttendanceHistory({
        employee_id: user?.id,
        date_from: yesterday,
        date_to: yesterday,
        limit: 20,
        page: 1,
      });
      const decision = getAttendanceScanDecisionForToday(openRecord, todayRecords, today, new Date(), yesterdayRecords);

      if (decision.action === 'blocked') {
        const isCooldown = /baru saja check-in/i.test(decision.message);
        setScanFailure({
          title: isCooldown ? 'Tunggu Sebentar' : 'Presensi Hari Ini Selesai',
          message: decision.message,
          reasons: [],
          mode: scanMode,
          actionLabel: isCooldown ? 'Tunggu Sebentar' : 'Mengerti',
          tone: isCooldown ? 'guidance' : 'success',
        });
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
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const result = await attendanceService.checkin(qrPayload);
        setCheckinMessage(result.message ?? 'Check-in berhasil');
        setSuccessTime(formatSuccessTime());
      }
      const latest = await attendanceService.getTodayRecord();
      setSuccessIsLate(getAttendanceIsLate(latest));
      queryClient.setQueryData(['attendance-open-checkin', user?.id], latest ?? null);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['attendance-open-checkin', user?.id], exact: true }),
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

  const handleRetryScanner = async () => {
    if (isLocationRelatedFailure(scanFailure)) {
      await requestLocationPermission(Location.Accuracy.High);
      setScanned(false);
      setScanFailure(null);
      return;
    }
    setScanned(false);
    setErrorMessage(null);
    setCheckinMessage(null);
    setSuccessTime(null);
    setScanFailure(null);
  };

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    setScanned(false);
    setCheckinMessage(null);
    setSuccessTime(null);
    setErrorMessage(null);
    setScanFailure(null);
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
  const failureActionLabel = getFailureActionLabel(scanFailure);
  const failureActionHint = scanFailure?.actionHint;
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
          actionLabel={failureActionLabel}
          actionHint={failureActionHint}
          tone={scanFailure?.tone}
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
          onPress={() => goBackOrTabs(router)}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
        >
          <MaterialIcons name="arrow-back" size={24} color={Tokens.colors.primary} />
        </Pressable>
        <Text className="font-manrope-extrabold text-xl text-primary flex-1 text-center mr-10">
          {hasSelfieCategory ? 'Absensi Selfie' : 'Silahkan Scan QR Code / Wajah Anda'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        <View className="flex-1 items-center justify-center gap-4 w-full max-w-[340px] z-10">
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
              <Button title="Coba Lagi" onPress={() => requestLocationPermission()} className="w-full mt-2" />
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
              <Button title="Coba Lagi" onPress={() => requestLocationPermission()} className="w-full mt-2" />
            </View>
          )}

          {status === 'granted' && cameraStatus === 'denied' && (
            <View className="items-center gap-4 w-full bg-white rounded-3xl p-6 shadow-sm border border-white/80">
              <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-2">
                <MaterialIcons name="camera-alt" size={32} color={Tokens.colors.error} />
              </View>
              <Text className="font-manrope-bold text-lg text-primary text-center">Izin Kamera Diperlukan</Text>
              <Text className="font-inter text-sm text-on-surface-variant text-center px-2">
                Harap berikan izin kamera untuk melanjutkan absensi.
              </Text>
              <Button title="Beri Izin Kamera" onPress={requestCameraPermission} className="w-full mt-2" />
            </View>
          )}

          {status === 'granted' && cameraStatus === 'granted' && (
            <View className="items-center w-full gap-4">
              {!hasSelfieCategory && scanMode === 'qr' && (
                <View className="w-full rounded-2xl bg-white/80 px-4 py-3 border border-white/90 shadow-sm">
                  <Text className="font-inter-bold text-[10px] text-primary uppercase tracking-wider">Lokasi Saat Ini</Text>
                  <Text className="font-inter text-xs text-on-surface-variant mt-1 leading-5">
                    {address || 'Mengambil lokasi jalan...'}
                  </Text>
                </View>
              )}

              {isScannerVisible && (
                <>
                  {hasSelfieCategory && scanMode === 'selfie' && (
                    <View className="w-full rounded-3xl bg-white/95 px-4 py-4 border border-white/90 shadow-sm mb-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-inter-bold text-[10px] text-primary uppercase tracking-wider">
                          Shift Tersedia
                        </Text>
                        {selfieAssignment?.store?.code && (
                          <View className="bg-primary/10 px-2.5 py-0.5 rounded-full">
                            <Text className="font-inter-bold text-[10px] text-primary">
                              {selfieAssignment.store.code}
                            </Text>
                          </View>
                        )}
                      </View>
                      {selfieAssignmentLoading ? (
                        <View className="mt-3 gap-2">
                          <Skeleton height={18} width="72%" />
                          <Skeleton height={14} width="48%" />
                        </View>
                      ) : selfieAssignmentError ? (
                        <View className="mt-3 gap-2">
                          <Text className="font-inter text-sm text-error">{selfieAssignmentError}</Text>
                          <Button
                            title="Coba Lagi"
                            onPress={() => setAssignmentReloadTick((value) => value + 1)}
                            className="mt-1"
                          />
                        </View>
                      ) : (
                        <View className="mt-2 gap-1.5">
                          <Text className="font-manrope-bold text-base text-primary">
                            {selfieAssignment?.store?.name || selfieAssignment?.store?.code || 'Selfie Mode'}
                          </Text>
                          <Text className="font-inter text-xs text-on-surface-variant">
                            {selfieAssignment?.employee?.full_name || user?.full_name || '-'} • {user?.employee_category || '-'}
                          </Text>
                          <View className="mt-2">
                            <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider mb-2">
                              Pilih Shift Toko
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {selfieShifts.map((shift: EmpStoreShift) => {
                                const active = shift.id === selectedShift?.id;
                                return (
                                  <Pressable
                                    key={shift.id}
                                    onPress={() => setSelectedShiftId(shift.id)}
                                    className={`px-3.5 py-2 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-white border-outline-variant'}`}
                                  >
                                    <Text className={`font-inter-bold text-xs ${active ? 'text-white' : 'text-primary'}`}>
                                      {shift.name || shift.code || 'Shift'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {scanMode === 'qr' ? (
                    <View className="w-full aspect-square rounded-3xl overflow-hidden border-[4px] border-primary-container/20 shadow-2xl relative">
                      <CameraView
                        style={{ flex: 1 }}
                        facing="back"
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
                        <View className="absolute inset-0 items-center justify-center bg-black/45 z-20">
                          <View className="items-center rounded-3xl bg-white/92 px-5 py-4 shadow-lg">
                            <ActivityIndicator size="large" color={Tokens.colors.primary} />
                            <Text className="font-inter-bold text-sm text-primary mt-3 text-center">
                              Mengirim payload selfie
                            </Text>
                          </View>
                        </View>
                      )}
                      <View className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-xl border border-white/30 z-10">
                        <Text className="font-inter text-xs text-white/90 leading-relaxed">
                          {address ? `${address}\n` : ''}Lat: {coords?.lat.toFixed(6)}, Long: {coords?.long.toFixed(6)}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text className="font-inter text-xs text-text-muted italic text-center mt-1 px-6">
                    {scanMode === 'qr'
                      ? 'Arahkan kamera ke QR Code tablet untuk Check-in/Out'
                      : 'Posisikan wajah Anda di kamera, lalu tekan tombol foto di bawah.'}
                  </Text>

                  {!hasSelfieCategory && (
                    <View className="flex-row items-center justify-center mt-2 gap-4 w-full">
                      <Pressable
                        onPress={() => handleModeChange('qr')}
                        className={`flex-1 py-3 rounded-xl border items-center ${scanMode === 'qr' ? 'bg-primary border-primary' : 'bg-transparent border-primary/20'}`}
                      >
                        <Text className={`font-inter-bold text-sm ${scanMode === 'qr' ? 'text-white' : 'text-primary'}`}>Scan QR</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleModeChange('selfie')}
                        className={`flex-1 py-3 rounded-xl border items-center ${scanMode === 'selfie' ? 'bg-primary border-primary' : 'bg-transparent border-primary/20'}`}
                      >
                        <Text className={`font-inter-bold text-sm ${scanMode === 'selfie' ? 'text-white' : 'text-primary'}`}>Foto Selfie</Text>
                      </Pressable>
                    </View>
                  )}

                  {scanMode === 'selfie' && (
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
      </ScrollView>
    </SafeAreaView>
  );
}
