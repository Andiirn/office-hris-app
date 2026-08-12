import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ProcessedImage {
  uri: string;
  name: string;
  mimeType: string;
}

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const HEIC_EXTENSIONS = new Set(['heic', 'heif']);
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

/**
 * Mengekstrak ekstensi file dari nama file atau URI.
 */
export function getFileExtension(filenameOrUri: string): string {
  const clean = filenameOrUri.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return '';
}

/**
 * Menguji apakah nama file/URI atau MIME type merupakan format HEIC/HEIF (khas iOS).
 */
export function isHeicFormat(fileNameOrUri: string, mimeType?: string | null): boolean {
  const ext = getFileExtension(fileNameOrUri);
  if (HEIC_EXTENSIONS.has(ext)) return true;
  if (mimeType && HEIC_MIME_TYPES.has(mimeType.toLowerCase())) return true;
  return false;
}

/**
 * Menguji apakah file merupakan format gambar yang didukung (JPG, JPEG, PNG).
 */
export function isValidImageFormat(fileNameOrUri: string, mimeType?: string | null): boolean {
  const ext = getFileExtension(fileNameOrUri);
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  if (mimeType && ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) return true;
  return false;
}

/**
 * Memvalidasi dan menormalisasi aset gambar yang dipilih dari ImagePicker.
 * - Mengonversi HEIC ke JPG jika nama/MIME terdeteksi HEIC.
 * - Menolak format lain selain JPG, JPEG, PNG dengan pesan Alert.
 */
export function processPickedAsset(asset: ImagePicker.ImagePickerAsset): ProcessedImage | null {
  const rawUri = asset.uri;
  let fileName = asset.fileName || `image_${Date.now()}.jpg`;
  let mimeType = asset.mimeType || 'image/jpeg';

  // 1. Cek jika format HEIC -> ubah nama & mimeType ke JPG (karena iOS Compatible mode mengekspornya ke JPEG)
  if (isHeicFormat(fileName, mimeType) || isHeicFormat(rawUri, mimeType)) {
    const ext = getFileExtension(fileName);
    if (ext) {
      fileName = fileName.replace(new RegExp(`\\.${ext}$`, 'i'), '.jpg');
    } else {
      fileName = `${fileName}.jpg`;
    }
    mimeType = 'image/jpeg';
  }

  // 2. Validasi format akhir (harus JPG / JPEG / PNG)
  const isValid = isValidImageFormat(fileName, mimeType) || isValidImageFormat(rawUri, mimeType);

  if (!isValid) {
    Alert.alert(
      'Format Tidak Didukung',
      'Hanya format gambar JPG, JPEG, dan PNG yang diperbolehkan. Silakan pilih gambar lain.'
    );
    return null;
  }

  return {
    uri: rawUri,
    name: fileName,
    mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
  };
}

/**
 * Opsi standar untuk ImagePicker yang memastikan konversi HEIC -> JPEG di iOS secara otomatis.
 */
export const COMPATIBLE_IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.8,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};
