import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_FINGERPRINT_KEY = 'device_fingerprint';

function generateFallbackFingerprint() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export async function getStableDeviceFingerprint() {
  const cached = await SecureStore.getItemAsync(DEVICE_FINGERPRINT_KEY);
  if (cached) return cached;

  let nativeId: string | null = null;
  if (Platform.OS === 'android') {
    nativeId = Application.getAndroidId();
  } else if (Platform.OS === 'ios') {
    nativeId = await Application.getIosIdForVendorAsync();
  }

  const fingerprint =
    (nativeId && nativeId.trim()) ||
    Device.osInternalBuildId ||
    Device.osBuildId ||
    generateFallbackFingerprint();

  await SecureStore.setItemAsync(DEVICE_FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}
