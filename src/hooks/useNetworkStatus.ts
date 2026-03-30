import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface UseNetworkStatusResult {
  isOnline: boolean;
  isWiFi: boolean;
  type: string | null;
}

/**
 * Hook that provides network connectivity status.
 * Uses @react-native-community/netinfo.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [networkState, setNetworkState] = useState<UseNetworkStatusResult>({
    isOnline: true,
    isWiFi: false,
    type: null,
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const state = await NetInfo.fetch();
      updateState(state);
    };
    checkNetwork();

    const unsubscribe = NetInfo.addEventListener((state) => {
      updateState(state);
    });

    return () => unsubscribe();
  }, []);

  const updateState = (state: NetInfoState) => {
    setNetworkState({
      isOnline: state.isConnected === true && state.isInternetReachable !== false,
      isWiFi: state.type === 'wifi',
      type: state.type,
    });
  };

  return networkState;
}
