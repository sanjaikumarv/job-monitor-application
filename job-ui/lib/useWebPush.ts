'use client';

import { useState } from 'react';
import { api } from './api';

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator,
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const [isRegistering, setIsRegistering] = useState(false);

  const requestAndRegister = async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsRegistering(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setIsRegistering(false);
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service worker registered:', registration.scope);

      // Generate or retrieve device token identifier
      let token = localStorage.getItem('fcm_web_token');
      if (!token) {
        token = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('fcm_web_token', token);
      }

      await api.registerDevice({
        token,
        deviceType: 'web',
      });

      setIsRegistering(false);
      return true;
    } catch (err) {
      console.error('Failed to register web push:', err);
      setIsRegistering(false);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isRegistering,
    requestAndRegister,
  };
}

