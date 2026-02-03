// Task Executor - Handles automation flows for the AI assistant
import { 
  isNative, 
  platform, 
  openInAppBrowser, 
  deepLinks, 
  getCurrentLocation,
  hapticFeedback,
  scheduleNotification,
  requestNotificationPermission,
} from './index';

export interface TaskAction {
  type: 'navigate' | 'search' | 'select' | 'fill' | 'click' | 'wait' | 'handoff' | 'notify';
  target?: string;
  value?: string;
  description: string;
}

export interface TaskPlan {
  intent: string;
  service: string;
  actions: TaskAction[];
  requiresLogin: boolean;
  requiresPayment: boolean;
}

// Detect which app/service to use for a task
export function detectService(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  // Airlines
  if (lowerQuery.includes('delta')) return 'delta';
  if (lowerQuery.includes('united')) return 'united';
  if (lowerQuery.includes('american airlines') || lowerQuery.includes('aa ')) return 'americanAirlines';
  if (lowerQuery.includes('flight') || lowerQuery.includes('fly')) return 'genericFlight';
  
  // Ride sharing
  if (lowerQuery.includes('uber') && !lowerQuery.includes('eats')) return 'uber';
  if (lowerQuery.includes('lyft')) return 'lyft';
  if (lowerQuery.includes('ride') || lowerQuery.includes('cab') || lowerQuery.includes('taxi')) return 'uber';
  
  // Food
  if (lowerQuery.includes('doordash')) return 'doordash';
  if (lowerQuery.includes('uber eats') || lowerQuery.includes('ubereats')) return 'ubereats';
  if (lowerQuery.includes('food') || lowerQuery.includes('order') || lowerQuery.includes('delivery')) return 'doordash';
  
  // Movies
  if (lowerQuery.includes('movie') || lowerQuery.includes('cinema') || lowerQuery.includes('theatre') || lowerQuery.includes('theater')) return 'fandango';
  if (lowerQuery.includes('amc')) return 'amcTheatres';
  
  // Shopping
  if (lowerQuery.includes('amazon')) return 'amazon';
  if (lowerQuery.includes('buy') || lowerQuery.includes('shop') || lowerQuery.includes('purchase')) return 'amazon';
  
  return null;
}

// Get the appropriate URL for a service
export function getServiceUrl(service: string, params?: Record<string, string>): string {
  const serviceConfig = deepLinks[service as keyof typeof deepLinks];
  
  if (!serviceConfig) {
    // Default to web search
    const query = params?.query || '';
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
  
  // For flights with Delta
  if (service === 'delta' && params?.from && params?.to && params?.date) {
    const deltaConfig = serviceConfig as typeof deepLinks.delta;
    return deltaConfig.search(params.from, params.to, params.date);
  }
  
  // For Amazon search
  if (service === 'amazon' && params?.query) {
    const amazonConfig = serviceConfig as typeof deepLinks.amazon;
    return amazonConfig.search(params.query);
  }
  
  // For Uber rides
  if (service === 'uber' && params?.pickup && params?.dropoff) {
    const uberConfig = serviceConfig as typeof deepLinks.uber;
    return uberConfig.ride(params.pickup, params.dropoff);
  }
  
  return serviceConfig.web;
}

// Execute a navigation action
export async function executeNavigation(service: string, params?: Record<string, string>) {
  const url = getServiceUrl(service, params);
  
  // Provide haptic feedback on native
  await hapticFeedback('medium');
  
  // Open in the in-app browser for better UX on native
  await openInAppBrowser(url);
  
  return {
    success: true,
    url,
    message: `Opened ${service} in browser. Please complete any login if required.`,
  };
}

// Request location and format for API usage
export async function getFormattedLocation(): Promise<{
  coords: { lat: number; lng: number };
  formatted: string;
} | null> {
  try {
    const location = await getCurrentLocation();
    
    // In a real app, you'd reverse geocode this
    // For now, return the coordinates
    return {
      coords: { lat: location.latitude, lng: location.longitude },
      formatted: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
    };
  } catch {
    return null;
  }
}

// Schedule a reminder notification
export async function scheduleTaskReminder(taskDescription: string, minutesFromNow: number = 5) {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    return { success: false, message: 'Notification permission not granted' };
  }
  
  const scheduleDate = new Date(Date.now() + minutesFromNow * 60 * 1000);
  
  await scheduleNotification({
    id: Date.now(),
    title: 'Axiom Reminder',
    body: taskDescription,
    schedule: scheduleDate,
  });
  
  return { success: true, message: `Reminder set for ${minutesFromNow} minutes from now` };
}

// Generate task execution context for the AI
export function getExecutionContext(): Record<string, unknown> {
  return {
    platform,
    isNative,
    capabilities: {
      deepLinking: isNative,
      inAppBrowser: true,
      location: true,
      notifications: isNative,
      haptics: isNative,
      share: true,
    },
    availableServices: Object.keys(deepLinks),
    automationMode: 'web', // We're using web fallback as per user preference
  };
}

// Format task status for display
export type TaskStatus = 'planning' | 'navigating' | 'waiting_login' | 'waiting_action' | 'waiting_payment' | 'complete' | 'error';

export function getStatusMessage(status: TaskStatus, service?: string): string {
  switch (status) {
    case 'planning':
      return 'Planning your task...';
    case 'navigating':
      return `Opening ${service || 'the service'}...`;
    case 'waiting_login':
      return 'Please log in to continue. Let me know when you\'re done.';
    case 'waiting_action':
      return 'Please make your selection. I\'ll wait for your input.';
    case 'waiting_payment':
      return 'Please complete the payment. I\'ve finished all other steps.';
    case 'complete':
      return 'Task completed successfully!';
    case 'error':
      return 'Something went wrong. Please try again.';
    default:
      return 'Processing...';
  }
}
