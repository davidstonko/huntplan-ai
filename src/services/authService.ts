/**
 * @file authService.ts
 * @description Authentication service for anonymous-first user system.
 * Handles device registration, JWT storage, and token refresh.
 *
 * Flow: App launch → check stored token → if none, register device → store JWT.
 * All subsequent API calls include the JWT in Authorization header.
 *
 * @module services/authService
 * @version 3.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = __DEV__
  ? 'http://localhost:8000/api/v1'
  : 'https://huntplan-api.onrender.com/api/v1';

const STORAGE_KEYS = {
  accessToken: '@auth_access_token',
  userId: '@auth_user_id',
  handle: '@auth_handle',
  deviceToken: '@auth_device_token',
};

// ─── Types ───────────────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  handle: string | null;
  accessToken: string | null;
}

export interface UserProfile {
  user_id: string;
  handle: string;
  email?: string;
  experience_level?: string;
  preferred_species?: string;
  home_county?: string;
  home_state?: string;
  reputation_score: number;
  is_verified_hunter: boolean;
}

// ─── Core Auth Functions ─────────────────────────────────────────

/**
 * Initialize auth on app launch.
 * Checks for stored token; if none, registers device anonymously.
 */
export async function initAuth(): Promise<AuthState> {
  try {
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);
    const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.userId);
    const storedHandle = await AsyncStorage.getItem(STORAGE_KEYS.handle);

    if (storedToken && storedUserId) {
      // Verify token is still valid
      try {
        await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        return {
          isAuthenticated: true,
          userId: storedUserId,
          handle: storedHandle,
          accessToken: storedToken,
        };
      } catch {
        // Token expired — try refresh
        return await refreshAuth(storedToken);
      }
    }

    // No stored token — register new device
    return await registerDevice();
  } catch (error) {
    console.warn('[Auth] Init failed, running offline:', error);
    return {
      isAuthenticated: false,
      userId: null,
      handle: null,
      accessToken: null,
    };
  }
}

/**
 * Register a new anonymous device. Called on first launch.
 */
export async function registerDevice(handle?: string): Promise<AuthState> {
  try {
    // Generate a device-unique token
    let deviceToken = await AsyncStorage.getItem(STORAGE_KEYS.deviceToken);
    if (!deviceToken) {
      deviceToken = generateDeviceToken();
      await AsyncStorage.setItem(STORAGE_KEYS.deviceToken, deviceToken);
    }

    const response = await axios.post(`${API_BASE}/auth/register`, {
      device_token: deviceToken,
      handle: handle || undefined,
    });

    const { user_id, handle: serverHandle, access_token } = response.data;

    // Store credentials
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.accessToken, access_token],
      [STORAGE_KEYS.userId, user_id],
      [STORAGE_KEYS.handle, serverHandle],
    ]);

    return {
      isAuthenticated: true,
      userId: user_id,
      handle: serverHandle,
      accessToken: access_token,
    };
  } catch (error) {
    console.warn('[Auth] Registration failed:', error);
    return {
      isAuthenticated: false,
      userId: null,
      handle: null,
      accessToken: null,
    };
  }
}

/**
 * Refresh an expired JWT token.
 */
async function refreshAuth(expiredToken: string): Promise<AuthState> {
  try {
    const response = await axios.post(`${API_BASE}/auth/refresh`, {
      access_token: expiredToken,
    });

    const { access_token } = response.data;
    const userId = await AsyncStorage.getItem(STORAGE_KEYS.userId);
    const handle = await AsyncStorage.getItem(STORAGE_KEYS.handle);

    await AsyncStorage.setItem(STORAGE_KEYS.accessToken, access_token);

    return {
      isAuthenticated: true,
      userId,
      handle,
      accessToken: access_token,
    };
  } catch {
    // Full re-registration needed
    return await registerDevice();
  }
}

/**
 * Get the stored access token for API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Get the stored user ID.
 */
export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.userId);
}

/**
 * Get the current user's profile from the server.
 */
export async function getProfile(): Promise<UserProfile | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch {
    return null;
  }
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const response = await axios.patch(`${API_BASE}/auth/me`, updates, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Update stored handle if changed
    if (updates.handle) {
      await AsyncStorage.setItem(STORAGE_KEYS.handle, updates.handle);
    }

    return response.data;
  } catch {
    return null;
  }
}

/**
 * Sign out — clears stored credentials.
 */
export async function signOut(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.userId,
    STORAGE_KEYS.handle,
  ]);
}

// ─── Helpers ─────────────────────────────────────────────────────

function generateDeviceToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create an axios instance with auth headers pre-configured.
 */
export function createAuthenticatedClient() {
  const client = axios.create({ baseURL: API_BASE });

  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}
