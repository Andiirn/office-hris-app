import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Tokens } from '../../src/core/theme/tokens';
import { Button } from '../../src/components/ui/Button';
import { attendanceService } from '../../src/services/attendance.service';

type LocationStatus = 'loading' | 'granted' | 'denied';
type CameraStatus = 'loading' | 'granted' | 'denied';

export default function AttendanceScreen() {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
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
        setErrorMessage('Izinkan akses lokasi untuk check-in / check-out.');
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ lat: position.coords.latitude, long: position.coords.longitude });
        setStatus('granted');
        return;
      } catch {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setCoords({ lat: lastKnown.coords.latitude, long: lastKnown.coords.longitude });
          setStatus('granted');
          return;
        }
      }

      setStatus('denied');
      setErrorMessage('Lokasi tidak tersedia. Pastikan GPS perangkat aktif lalu coba lagi.');
    } catch {
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
      } catch {
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
      const hasCheckin = !!todayRecord?.checkin_at;
      const hasCheckout = !!todayRecord?.checkout_at;

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
          is_mock_location: false,
          is_rooted: false,
          battery_level: 0,
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
      setErrorMessage(error?.response?.data?.message ?? error?.message ?? 'Gagal proses attendance');
    } finally {
      setSubmitting(false);
    }
  }, [coords, height, parseQrPayload, todayRecord, width]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Attendance Scanner</Text>
        {status === 'loading' && <ActivityIndicator size="large" color={Tokens.colors.primary} />}
        {status === 'denied' && (
          <>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button title="Buka Pengaturan" onPress={() => Linking.openSettings()} />
            <View style={styles.spacer} />
            <Button title="Coba Lagi" onPress={requestLocationPermission} />
          </>
        )}
        {status === 'granted' && cameraStatus === 'granted' && (
          <>
            <View style={styles.scannerWrap}>
              <CameraView
                style={styles.scanner}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : ({ data }) => {
                  setScanned(true);
                  submitAttendance(data);
                }}
              />
            </View>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {checkinMessage ? <Text style={styles.successText}>{checkinMessage}</Text> : null}
            {scanned ? <Button title="Scan Ulang" loading={submitting} onPress={() => { setScanned(false); setErrorMessage(null); setCheckinMessage(null); }} /> : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background },
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 24, color: Tokens.colors.text },
  scannerWrap: { width: '100%', maxWidth: 340, aspectRatio: 1, borderRadius: 16, overflow: 'hidden' },
  scanner: { flex: 1 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Tokens.colors.error, textAlign: 'center' },
  successText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1f6b42', textAlign: 'center' },
  spacer: { height: 4 },
});
