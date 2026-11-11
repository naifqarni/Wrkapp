import AsyncStorage from '@react-native-async-storage/async-storage';

/** Bump the version to show the intro again to everyone after a rewrite. */
export const INTRO_KEY = 'wrk-intro-seen-v1';

export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_KEY)) === '1';
  } catch {
    // If storage fails, do not trap the member behind the intro on every launch.
    return true;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_KEY, '1');
  } catch {}
}

/** Development: makes the next launch show the intro again. */
export async function resetIntro(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTRO_KEY);
  } catch {}
}
