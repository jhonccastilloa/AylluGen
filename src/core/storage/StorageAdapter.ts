import { createMMKV, MMKV } from 'react-native-mmkv';

class StorageAdapter {
  private static storage: MMKV = createMMKV(); // estático

  static getItem(key: string): string | null {
    try {
      const value = this.storage.getString(key);
      if (!value) return null;
      return value;
    } catch (error) {
      console.error(`Storage error: getItem for key "${key}"`, error);
      throw new Error(`Error getting item ${key}`);
    }
  }

  static setItem(key: string, value: string): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error(`Storage error: setItem for key "${key}"`, error);
      throw new Error(`Error setting item ${key}`);
    }
  }

  static removeItem(key: string): void {
    try {
      this.storage.remove(key);
    } catch (error) {
      console.error(`Storage error: removeItem for key "${key}"`, error);
      throw new Error(`Error removing item ${key}`);
    }
  }
}

export default StorageAdapter;
