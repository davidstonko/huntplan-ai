/**
 * @file activityMode.test.tsx
 * @description Tests for src/context/ActivityModeContext.tsx
 * Verifies activity mode context, persistence, and mode switching.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityModeProvider,
  useActivityMode,
  ActivityMode,
} from '../context/ActivityModeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('ActivityModeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ActivityModeProvider>{children}</ActivityModeProvider>
  );

  describe('useActivityMode hook', () => {
    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useActivityMode());
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('useActivityMode must be used within');
    });

    it('should provide context when within provider', () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('activeMode');
      expect(result.current).toHaveProperty('setActiveMode');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('Default mode', () => {
    it('should initialize with default mode "hunt"', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeMode).toBe('hunt');
    });

    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after loading', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Mode persistence with AsyncStorage', () => {
    it('should load persisted mode from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('fish');

      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeMode).toBe('fish');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@activity_mode');
    });

    it('should save mode to AsyncStorage when changed', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('camp');
      });

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@activity_mode', 'camp');
      });
    });

    it('should update activeMode after setActiveMode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeMode).toBe('hunt');

      act(() => {
        result.current.setActiveMode('hike');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('hike');
      });
    });
  });

  describe('Mode switching', () => {
    it('should support switching to "fish" mode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('fish');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('fish');
      });
    });

    it('should support switching to "camp" mode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('camp');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('camp');
      });
    });

    it('should support switching to "hike" mode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('hike');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('hike');
      });
    });

    it('should support switching to "crab" mode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('crab');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('crab');
      });
    });

    it('should support switching to "boat" mode', async () => {
      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('boat');
      });

      await waitFor(() => {
        expect(result.current.activeMode).toBe('boat');
      });
    });
  });

  describe('Invalid persisted data handling', () => {
    it('should default to "hunt" if persisted value is invalid', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid_mode');

      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeMode).toBe('hunt');
    });

    it('should default to "hunt" if getItem fails', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('AsyncStorage error'));

      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeMode).toBe('hunt');
    });
  });

  describe('Mode persistence error handling', () => {
    it('should continue to work if setItem fails', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage write error'));

      const { result } = renderHook(() => useActivityMode(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveMode('fish');
      });

      // Mode should still be updated in state even if persistence fails
      await waitFor(() => {
        expect(result.current.activeMode).toBe('fish');
      });
    });
  });
});
