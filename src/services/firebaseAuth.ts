import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

// Retrieve active configuration (custom Gomarché or default)
export const getActiveFirebaseConfig = (): FirebaseAppConfig => {
  try {
    const custom = localStorage.getItem('gm_custom_firebase_config');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed && parsed.projectId && parsed.apiKey && parsed.projectId !== 'gen-lang-client-0698707979') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read custom Firebase config from localStorage:', e);
  }
  return defaultFirebaseConfig as FirebaseAppConfig;
};

// Check if currently running on a custom Gomarché configuration
export const isUsingCustomFirebaseConfig = (): boolean => {
  try {
    const custom = localStorage.getItem('gm_custom_firebase_config');
    return !!custom;
  } catch {
    return false;
  }
};

// Initialize or reinitialize Firebase App
let activeApp: any = null;
export let auth: any = null;

try {
  const cfg = getActiveFirebaseConfig();
  if (getApps().length === 0) {
    activeApp = initializeApp(cfg);
  } else {
    activeApp = getApp();
  }
  auth = getAuth(activeApp);
} catch (e) {
  console.warn('Initial Firebase app initialization warning:', e);
}

// Configure Google Auth Provider with official Workspace & Sign-in scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('openid');
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Reinitialize Firebase with a new Gomarché project config
 */
export const updateFirebaseConfig = async (newConfig: FirebaseAppConfig): Promise<boolean> => {
  try {
    localStorage.setItem('gm_custom_firebase_config', JSON.stringify(newConfig));
    // If apps exist, delete default app to reinitialize
    if (getApps().length > 0) {
      const current = getApp();
      await deleteApp(current);
    }
    activeApp = initializeApp(newConfig);
    auth = getAuth(activeApp);
    return true;
  } catch (err) {
    console.error('Failed to update Firebase configuration:', err);
    throw err;
  }
};

/**
 * Reset Firebase config back to default applet config
 */
export const resetFirebaseConfig = async (): Promise<boolean> => {
  try {
    localStorage.removeItem('gm_custom_firebase_config');
    if (getApps().length > 0) {
      const current = getApp();
      await deleteApp(current);
    }
    activeApp = initializeApp(defaultFirebaseConfig);
    auth = getAuth(activeApp);
    return true;
  } catch (err) {
    console.error('Failed to reset Firebase configuration:', err);
    throw err;
  }
};

/**
 * Listen to auth state changes from Firebase
 */
export const initFirebaseAuth = (
  onUserChanged: (user: FirebaseUser | null, token: string | null) => void
) => {
  if (!auth) {
    onUserChanged(null, null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        cachedAccessToken = token;
        onUserChanged(user, token);
      } catch {
        onUserChanged(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      onUserChanged(null, null);
    }
  });
};

/**
 * Real Google Sign-In with official Google popup
 */
export const googleSignIn = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> => {
  if (!auth) {
    throw new Error('Service d\'authentification indisponible. Rechargez la page.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || (await result.user.getIdToken());
    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Real Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out of Firebase Auth
 */
export const firebaseLogout = async () => {
  cachedAccessToken = null;
  if (auth) {
    await signOut(auth);
  }
};
