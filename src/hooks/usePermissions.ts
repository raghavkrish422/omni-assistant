import { useState, useCallback, useEffect } from "react";

export type PermissionType = "camera" | "microphone" | "location" | "screen" | "notifications";

export interface PermissionStatus {
  camera: "granted" | "denied" | "prompt" | "unavailable";
  microphone: "granted" | "denied" | "prompt" | "unavailable";
  location: "granted" | "denied" | "prompt" | "unavailable";
  screen: "granted" | "prompt" | "unavailable";
  notifications: "granted" | "denied" | "prompt" | "unavailable";
}

export interface PermissionInfo {
  name: PermissionType;
  label: string;
  description: string;
  icon: string;
  status: "granted" | "denied" | "prompt" | "unavailable";
  lastUsed?: Date;
}

const PERMISSIONS_STORAGE_KEY = "axiom_permissions_state";

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: "prompt",
    microphone: "prompt",
    location: "prompt",
    screen: "prompt",
    notifications: "prompt",
  });
  const [isChecking, setIsChecking] = useState(true);
  const [hasShownDialog, setHasShownDialog] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Check stored permissions and browser permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      setIsChecking(true);
      const newPermissions: PermissionStatus = { ...permissions };

      // Check if we've shown dialog before
      const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (stored) {
        setHasShownDialog(true);
      }

      // Check camera permission
      if (navigator.permissions) {
        try {
          const camera = await navigator.permissions.query({ name: "camera" as PermissionName });
          newPermissions.camera = camera.state;
        } catch {
          // Camera permission query not supported
        }

        try {
          const microphone = await navigator.permissions.query({ name: "microphone" as PermissionName });
          newPermissions.microphone = microphone.state;
        } catch {
          // Microphone permission query not supported
        }

        try {
          const geolocation = await navigator.permissions.query({ name: "geolocation" });
          newPermissions.location = geolocation.state;
        } catch {
          // Geolocation permission query not supported
        }

        try {
          const notifications = await navigator.permissions.query({ name: "notifications" });
          newPermissions.notifications = notifications.state;
        } catch {
          // Notifications permission query not supported
        }
      }

      // Screen sharing can only be checked when requested
      if (!navigator.mediaDevices?.getDisplayMedia) {
        newPermissions.screen = "unavailable";
      }

      setPermissions(newPermissions);
      setIsChecking(false);
    };

    checkPermissions();
  }, []);

  // Request camera permission
  const requestCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(prev => {
        if (prev) {
          prev.getTracks().forEach(track => track.stop());
        }
        return stream;
      });
      setPermissions(prev => ({ ...prev, camera: "granted" }));
      return true;
    } catch (error) {
      console.error("Camera permission denied:", error);
      setPermissions(prev => ({ ...prev, camera: "denied" }));
      return false;
    }
  }, []);

  // Request microphone permission
  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(prev => {
        if (prev) {
          // Keep video track if exists, add audio
          const videoTrack = prev.getVideoTracks()[0];
          if (videoTrack) {
            stream.addTrack(videoTrack);
          }
          prev.getTracks().forEach(track => track.stop());
        }
        return stream;
      });
      setPermissions(prev => ({ ...prev, microphone: "granted" }));
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setPermissions(prev => ({ ...prev, microphone: "denied" }));
      return false;
    }
  }, []);

  // Request location permission
  const requestLocation = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setPermissions(prev => ({ ...prev, location: "unavailable" }));
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissions(prev => ({ ...prev, location: "granted" }));
          resolve(true);
        },
        () => {
          setPermissions(prev => ({ ...prev, location: "denied" }));
          resolve(false);
        }
      );
    });
  }, []);

  // Request screen sharing permission
  const requestScreen = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setPermissions(prev => ({ ...prev, screen: "unavailable" }));
        return null;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });

      setScreenStream(stream);
      setPermissions(prev => ({ ...prev, screen: "granted" }));

      // Handle when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setPermissions(prev => ({ ...prev, screen: "prompt" }));
      };

      return stream;
    } catch (error) {
      console.error("Screen sharing denied:", error);
      setPermissions(prev => ({ ...prev, screen: "prompt" }));
      return null;
    }
  }, []);

  // Request notifications permission
  const requestNotifications = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      setPermissions(prev => ({ ...prev, notifications: "unavailable" }));
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissions(prev => ({ 
        ...prev, 
        notifications: permission === "granted" ? "granted" : "denied" 
      }));
      return permission === "granted";
    } catch {
      setPermissions(prev => ({ ...prev, notifications: "denied" }));
      return false;
    }
  }, []);

  // Request all essential permissions
  const requestAllPermissions = useCallback(async () => {
    await Promise.all([
      requestMicrophone(),
      requestLocation(),
    ]);
    
    // Mark that we've shown the dialog
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify({ shown: true, timestamp: Date.now() }));
    setHasShownDialog(true);
  }, [requestMicrophone, requestLocation]);

  // Stop all streams
  const stopAllStreams = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [mediaStream, screenStream]);

  // Get permission info list
  const getPermissionsList = useCallback((): PermissionInfo[] => {
    return [
      {
        name: "microphone",
        label: "Microphone",
        description: "For voice commands and meeting transcription",
        icon: "mic",
        status: permissions.microphone,
      },
      {
        name: "camera",
        label: "Camera",
        description: "For video calls and visual recognition",
        icon: "camera",
        status: permissions.camera,
      },
      {
        name: "location",
        label: "Location",
        description: "For local services and delivery",
        icon: "map-pin",
        status: permissions.location,
      },
      {
        name: "screen",
        label: "Screen Sharing",
        description: "For meeting recording and browser automation",
        icon: "monitor",
        status: permissions.screen,
      },
      {
        name: "notifications",
        label: "Notifications",
        description: "For task updates and reminders",
        icon: "bell",
        status: permissions.notifications,
      },
    ];
  }, [permissions]);

  return {
    permissions,
    isChecking,
    hasShownDialog,
    mediaStream,
    screenStream,
    requestCamera,
    requestMicrophone,
    requestLocation,
    requestScreen,
    requestNotifications,
    requestAllPermissions,
    stopAllStreams,
    getPermissionsList,
  };
}
