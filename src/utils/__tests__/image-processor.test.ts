import { Alert } from 'react-native';
import {
  getFileExtension,
  isHeicFormat,
  isValidImageFormat,
  processPickedAsset,
} from '../image-processor';

jest.spyOn(Alert, 'alert');

describe('image-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFileExtension', () => {
    it('extracts extension correctly', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('document.PDF')).toBe('pdf');
      expect(getFileExtension('/path/to/image.PNG?param=1')).toBe('png');
      expect(getFileExtension('noextension')).toBe('');
    });
  });

  describe('isHeicFormat', () => {
    it('detects HEIC extension or mime type', () => {
      expect(isHeicFormat('photo.heic')).toBe(true);
      expect(isHeicFormat('photo.heif')).toBe(true);
      expect(isHeicFormat('photo.jpg', 'image/heic')).toBe(true);
      expect(isHeicFormat('photo.jpg', 'image/jpeg')).toBe(false);
    });
  });

  describe('isValidImageFormat', () => {
    it('validates JPG, JPEG, and PNG formats', () => {
      expect(isValidImageFormat('photo.jpg')).toBe(true);
      expect(isValidImageFormat('photo.jpeg')).toBe(true);
      expect(isValidImageFormat('photo.png')).toBe(true);
      expect(isValidImageFormat('photo.bmp')).toBe(false);
      expect(isValidImageFormat('file.pdf')).toBe(false);
      expect(isValidImageFormat('file', 'image/png')).toBe(true);
    });
  });

  describe('processPickedAsset', () => {
    it('processes valid JPG asset', () => {
      const asset: any = {
        uri: 'file:///cache/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      };
      const result = processPickedAsset(asset);
      expect(result).toEqual({
        uri: 'file:///cache/photo.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('converts HEIC asset metadata to JPG', () => {
      const asset: any = {
        uri: 'file:///cache/photo.heic',
        fileName: 'photo.heic',
        mimeType: 'image/heic',
      };
      const result = processPickedAsset(asset);
      expect(result).toEqual({
        uri: 'file:///cache/photo.heic',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('shows Alert and returns null for invalid formats like BMP or PDF', () => {
      const asset: any = {
        uri: 'file:///cache/file.pdf',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
      };
      const result = processPickedAsset(asset);
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Format Tidak Didukung',
        'Hanya format gambar JPG, JPEG, dan PNG yang diperbolehkan. Silakan pilih gambar lain.'
      );
    });
  });
});
