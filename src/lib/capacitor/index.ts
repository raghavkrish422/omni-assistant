// Capacitor native bridge utilities
// This module provides cross-platform access to device capabilities

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'

// Device Information
export async function getDeviceInfo() {
  const info = await Device.getInfo();
  const id = await Device.getId();
  const battery = await Device.getBatteryInfo();
  const language = await Device.getLanguageCode();
  
  return {
    ...info,
    deviceId: id.identifier,
    batteryLevel: battery.batteryLevel,
    isCharging: battery.isCharging,
    language: language.value,
  };
}

// Location Services
export async function getCurrentLocation() {
  try {
    const permission = await Geolocation.checkPermissions();
    
    if (permission.location !== 'granted') {
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        throw new Error('Location permission denied');
      }
    }
    
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    console.error('Location error:', error);
    throw error;
  }
}

// Browser / In-App Browser for web automation
export async function openInAppBrowser(url: string, options?: { toolbarColor?: string }) {
  await Browser.open({
    url,
    presentationStyle: 'popover',
    toolbarColor: options?.toolbarColor || '#0a0a0a',
  });
}

export async function closeInAppBrowser() {
  await Browser.close();
}

// Listen for browser events (useful for OAuth flows)
export function addBrowserListeners(callbacks: {
  onFinished?: () => void;
  onLoaded?: () => void;
}) {
  if (callbacks.onFinished) {
    Browser.addListener('browserFinished', callbacks.onFinished);
  }
  if (callbacks.onLoaded) {
    Browser.addListener('browserPageLoaded', callbacks.onLoaded);
  }
  
  return () => {
    Browser.removeAllListeners();
  };
}

// Deep Linking - Open other apps
export async function openDeepLink(url: string): Promise<boolean> {
  try {
    // For native platforms, try to open the URL which will trigger the appropriate app
    if (isNative) {
      await Browser.open({ url });
      return true;
    }
    // For web, just open in new tab
    window.open(url, '_blank');
    return true;
  } catch (error) {
    console.error('Deep link error:', error);
    return false;
  }
}

// Common app deep links
export const deepLinks = {
  // Airlines
  delta: {
    ios: 'deltaair://',
    android: 'com.delta.mobile.android',
    web: 'https://www.delta.com',
    search: (from: string, to: string, date: string) => 
      `https://www.delta.com/flight-search/search-results?departureDate=${date}&origin=${from}&destination=${to}`,
  },
  united: {
    ios: 'unitedairlines://',
    android: 'com.united.mobile.android',
    web: 'https://www.united.com',
  },
  americanAirlines: {
    ios: 'aa://',
    android: 'com.aa.android',
    web: 'https://www.aa.com',
  },
  
  // Ride sharing
  uber: {
    ios: 'uber://',
    android: 'com.ubercab',
    web: 'https://m.uber.com',
    ride: (pickup: string, dropoff: string) => 
      `uber://?action=setPickup&pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`,
  },
  lyft: {
    ios: 'lyft://',
    android: 'me.lyft.android',
    web: 'https://www.lyft.com',
  },
  
  // Food delivery
  doordash: {
    ios: 'doordash://',
    android: 'com.dd.doordash',
    web: 'https://www.doordash.com',
  },
  ubereats: {
    ios: 'ubereats://',
    android: 'com.ubercab.eats',
    web: 'https://www.ubereats.com',
  },
  
  // Movies
  fandango: {
    ios: 'fandango://',
    android: 'com.fandango',
    web: 'https://www.fandango.com',
  },
  amcTheatres: {
    ios: 'amctheatres://',
    android: 'com.amc',
    web: 'https://www.amctheatres.com',
  },
  
  // Shopping
  amazon: {
    ios: 'amazon://',
    android: 'com.amazon.mShop.android.shopping',
    web: 'https://www.amazon.com',
    search: (query: string) => `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
  },
};

// Haptic Feedback
export async function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative) return;
  
  const styleMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  
  await Haptics.impact({ style: styleMap[type] });
}

export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative) return;
  
  // Use impact as fallback since notification types vary by Capacitor version
  const styleMap = {
    success: ImpactStyle.Light,
    warning: ImpactStyle.Medium,
    error: ImpactStyle.Heavy,
  };
  
  await Haptics.impact({ style: styleMap[type] });
}

// Share functionality
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}) {
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle,
    });
    return true;
  } catch (error) {
    console.error('Share error:', error);
    return false;
  }
}

// Local Notifications
export async function requestNotificationPermission() {
  const permission = await LocalNotifications.checkPermissions();
  
  if (permission.display !== 'granted') {
    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  }
  
  return true;
}

export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  schedule?: Date;
}) {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.schedule ? { at: options.schedule } : undefined,
        sound: 'default',
        actionTypeId: '',
        extra: null,
      },
    ],
  });
}

// App lifecycle
export function addAppStateListener(callback: (isActive: boolean) => void) {
  App.addListener('appStateChange', ({ isActive }) => {
    callback(isActive);
  });
  
  return () => {
    App.removeAllListeners();
  };
}

// Handle deep links coming INTO our app
export function addDeepLinkListener(callback: (url: string) => void) {
  App.addListener('appUrlOpen', (data) => {
    callback(data.url);
  });
  
  return () => {
    App.removeAllListeners();
  };
}
