/**
 * Data Access Layer - Preferences Repository
 * Handles user preferences persistence, separating data access from business logic
 */

import { storageRepository } from './storageRepository';

const STORAGE_KEY_VOICE = 'amora_selected_voice';
const STORAGE_KEY_PIN = 'amora_user_pin';
const STORAGE_KEY_PIN_SET = 'amora_pin_set';

class PreferencesRepository {
  getSelectedVoice(): string | null {
    return storageRepository.getString(STORAGE_KEY_VOICE);
  }

  setSelectedVoice(voice: string): void {
    storageRepository.setString(STORAGE_KEY_VOICE, voice);
  }

  clearSelectedVoice(): void {
    storageRepository.remove(STORAGE_KEY_VOICE);
  }

  getPin(): string | null {
    return storageRepository.getString(STORAGE_KEY_PIN);
  }

  setPin(pin: string): void {
    // Simple hash for basic security (in production, use proper hashing)
    const hashedPin = btoa(pin);
    storageRepository.setString(STORAGE_KEY_PIN, hashedPin);
    storageRepository.setString(STORAGE_KEY_PIN_SET, 'true');
  }

  isPinSet(): boolean {
    return storageRepository.getString(STORAGE_KEY_PIN_SET) === 'true';
  }

  validatePin(pin: string): boolean {
    const storedPin = preferencesRepository.getPin();
    if (!storedPin) {
      // First time user - default PIN is 1234
      return pin === '1234';
    }
    return btoa(pin) === storedPin;
  }
}

const preferencesRepository = new PreferencesRepository();
export { preferencesRepository };
