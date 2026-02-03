import { useState, useEffect, useCallback } from 'react';
import { 
  isNative, 
  platform, 
  getDeviceInfo, 
  getCurrentLocation,
  hapticFeedback,
  hapticNotification,
  shareContent,
  addAppStateListener,
  openInAppBrowser,
} from '@/lib/capacitor';
import { 
  detectService, 
  executeNavigation, 
  getExecutionContext,
  type TaskStatus,
  getStatusMessage,
} from '@/lib/capacitor/task-executor';

interface DeviceInfo {
  model: string;
  platform: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  deviceId: string;
  batteryLevel: number | undefined;
  isCharging: boolean | undefined;
  language: string;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useNativeCapabilities() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [isAppActive, setIsAppActive] = useState(true);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [currentService, setCurrentService] = useState<string | null>(null);

  // Load device info on mount
  useEffect(() => {
    if (isNative) {
      getDeviceInfo().then(setDeviceInfo).catch(console.error);
    } else {
      // Web fallback
      setDeviceInfo({
        model: 'Web Browser',
        platform: 'web',
        operatingSystem: navigator.platform,
        osVersion: navigator.userAgent,
        manufacturer: 'Unknown',
        isVirtual: false,
        deviceId: 'web-device',
        batteryLevel: undefined,
        isCharging: undefined,
        language: navigator.language,
      });
    }
  }, []);

  // Listen for app state changes
  useEffect(() => {
    if (isNative) {
      const cleanup = addAppStateListener(setIsAppActive);
      return cleanup;
    }
  }, []);

  // Request location
  const requestLocation = useCallback(async () => {
    try {
      const loc = await getCurrentLocation();
      setLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
      });
      return loc;
    } catch (error) {
      console.error('Failed to get location:', error);
      throw error;
    }
  }, []);

  // Execute a task from user query
  const executeTask = useCallback(async (query: string, params?: Record<string, string>) => {
    const service = detectService(query);
    
    if (!service) {
      return {
        success: false,
        message: 'I couldn\'t determine which service to use. Could you be more specific?',
      };
    }

    setCurrentService(service);
    setTaskStatus('navigating');
    
    await hapticFeedback('medium');
    
    const result = await executeNavigation(service, params);
    
    if (result.success) {
      setTaskStatus('waiting_action');
      await hapticNotification('success');
    } else {
      setTaskStatus('error');
      await hapticNotification('error');
    }
    
    return result;
  }, []);

  // Open a URL in the in-app browser
  const openBrowser = useCallback(async (url: string) => {
    await openInAppBrowser(url);
    await hapticFeedback('light');
  }, []);

  // Share content
  const share = useCallback(async (options: { title?: string; text?: string; url?: string }) => {
    const success = await shareContent(options);
    if (success) {
      await hapticNotification('success');
    }
    return success;
  }, []);

  // Update task status
  const updateTaskStatus = useCallback((status: TaskStatus) => {
    setTaskStatus(status);
    
    if (status === 'complete') {
      hapticNotification('success');
    } else if (status === 'error') {
      hapticNotification('error');
    } else {
      hapticFeedback('light');
    }
  }, []);

  // Clear task state
  const clearTask = useCallback(() => {
    setTaskStatus(null);
    setCurrentService(null);
  }, []);

  return {
    // Device info
    isNative,
    platform,
    deviceInfo,
    isAppActive,
    
    // Location
    location,
    requestLocation,
    
    // Task execution
    executeTask,
    taskStatus,
    currentService,
    taskStatusMessage: taskStatus ? getStatusMessage(taskStatus, currentService || undefined) : null,
    updateTaskStatus,
    clearTask,
    
    // Utilities
    openBrowser,
    share,
    hapticFeedback,
    hapticNotification,
    
    // Context for AI
    executionContext: getExecutionContext(),
  };
}
