/**
 * @file setup.ts
 * @description Jest test setup and shared mocks for MDHuntFishOutdoors frontend tests.
 * Provides mocks for AsyncStorage, React Native modules, Mapbox, and external SDKs.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock React Native global __DEV__ ─────────────────────────────────

(global as any).__DEV__ = true;

// ─── Mock AsyncStorage ────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

// ─── Mock React Native core modules ──────────────────────────────────

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj: Record<string, any>) => obj.ios),
  },
  StyleSheet: {
    create: jest.fn((styles: Record<string, any>) => styles),
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Linking: {
    openURL: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// ─── Mock React Navigation ──────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ params: {} })),
  NavigationContainer: ({ children }: { children: any }) => children,
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: any }) => children,
    Screen: ({ children }: { children: any }) => children,
  })),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: any }) => children,
    Screen: ({ children }: { children: any }) => children,
  })),
}));

// ─── Mock Mapbox GL ────────────────────────────────────────────────

jest.mock('@rnmapbox/maps', () => ({
  MapView: 'MapView',
  Camera: 'Camera',
  PointAnnotation: 'PointAnnotation',
  ShapeSource: 'ShapeSource',
  LineLayer: 'LineLayer',
  CircleLayer: 'CircleLayer',
  SymbolLayer: 'SymbolLayer',
  FillLayer: 'FillLayer',
  StyleURL: {
    Outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    Dark: 'mapbox://styles/mapbox/dark-v11',
    Light: 'mapbox://styles/mapbox/light-v11',
  },
  offlineManager: {
    getPacks: jest.fn(() => Promise.resolve([])),
    createPack: jest.fn(),
    deletePack: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

// ─── Mock RevenueCat SDK ───────────────────────────────────────────

jest.mock('react-native-purchases', () => ({
  default: {
    configure: jest.fn(() => Promise.resolve()),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restoreTransactions: jest.fn(),
  },
}), { virtual: true });

// ─── Mock Sentry SDK ───────────────────────────────────────────────

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  withProfiler: jest.fn((name: string, component: any) => component),
}), { virtual: true });

// ─── Mock Community Geolocation ──────────────────────────────────

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}), { virtual: true });

// ─── Mock NetInfo ──────────────────────────────────────────────

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}), { virtual: true });

// ─── Mock Background Geolocation ──────────────────────────────

jest.mock('react-native-background-geolocation', () => ({
  ready: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getCurrentPosition: jest.fn(),
  onLocation: jest.fn(),
}), { virtual: true });

// ─── Mock Vector Icons ──────────────────────────────────────────

jest.mock('react-native-vector-icons/Feather', () => 'FeatherIcon', { virtual: true });
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcon', { virtual: true });

// ─── Mock fetch globally for tests ──────────────────────────────

global.fetch = jest.fn();

// ─── Helper: Clear all mocks before each test ───────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.removeItem as jest.Mock).mockClear();
});
