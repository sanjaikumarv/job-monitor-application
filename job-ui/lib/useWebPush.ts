'use client';

import { useState, useEffect } from 'react';
import { api } from './api';

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredToken, setRegisteredToken] = useState<string>('');

  const getDeviceDetails = () => {
    if (typeof window === 'undefined') {
      return { deviceType: 'web', deviceName: 'Unknown Device', userAgent: '' };
    }

    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMac = /Macintosh/i.test(ua);
    const isWindows = /Windows/i.test(ua);

    let deviceType: 'web' | 'android' | 'ios' = 'web';
    let deviceName = 'Desktop / Laptop';

    if (isAndroid) {
      deviceType = 'android';
      deviceName = 'Android Mobile';
    } else if (isIOS) {
      deviceType = 'ios';
      deviceName = 'Apple Mobile';
    } else if (isWindows) {
      deviceName = 'Windows PC / Laptop';
    } else if (isMac) {
      deviceName = 'MacBook / Mac';
    }

    return { deviceType, deviceName, userAgent: ua };
  };

  // Automatically register device detail on initial open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasNotification = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    setIsSupported(hasNotification && hasSW);

    if (hasNotification) {
      setPermission(Notification.permission);
    }

    const autoCaptureDevice = async () => {
      try {
        let token = localStorage.getItem('fcm_device_token');
        if (!token) {
          const rand = Math.random().toString(36).substring(2, 10);
          token = `device-${Date.now()}-${rand}`;
          localStorage.setItem('fcm_device_token', token);
        }
        setRegisteredToken(token);

        const { deviceType, deviceName, userAgent } = getDeviceDetails();

        await api.registerDevice({
          token,
          deviceType,
          deviceName,
          userAgent,
        });

        // Register service worker if available
        if (hasSW) {
          navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
        }
      } catch (err) {
        console.error('Initial device capture failed:', err);
      }
    };

    autoCaptureDevice();
  }, []);

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

      let token = localStorage.getItem('fcm_device_token');
      if (!token) {
        token = `device-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('fcm_device_token', token);
      }

      const { deviceType, deviceName, userAgent } = getDeviceDetails();
      await api.registerDevice({
        token,
        deviceType,
        deviceName: `${deviceName} (Push Enabled)`,
        userAgent,
      });

      setIsRegistering(false);
      return true;
    } catch (err) {
      console.error('Failed to enable web push:', err);
      setIsRegistering(false);
      return false;
    }
  };

  const broadcastToAll = async (title?: string, body?: string) => {
    return api.broadcastPush({
      title: title || 'New Job Opportunity Alert!',
      body: body || 'A new position has been detected across monitored folders.',
      url: window.location.origin,
    });
  };

  return {
    isSupported,
    permission,
    isRegistering,
    registeredToken,
    requestAndRegister,
    broadcastToAll,
  };
}
