"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, getApiBaseUrl } from "./api";

const playAlertChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredToken, setRegisteredToken] = useState<string>("");
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const getDeviceDetails = () => {
    if (typeof window === "undefined") {
      return { deviceType: "web", deviceName: "Unknown Device", userAgent: "" };
    }
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMac = /Macintosh/i.test(ua);
    const isWindows = /Windows/i.test(ua);

    let deviceType: "web" | "android" | "ios" = "web";
    let deviceName = "Desktop / Laptop";

    if (isAndroid) {
      deviceType = "android";
      deviceName = "Android Mobile";
    } else if (isIOS) {
      deviceType = "ios";
      deviceName = "Apple Mobile";
    } else if (isWindows) {
      deviceName = "Windows PC / Laptop";
    } else if (isMac) {
      deviceName = "MacBook / Mac";
    }
    return { deviceType, deviceName, userAgent: ua };
  };

  const showNotificationBanner = useCallback(
    (title: string, body: string, url?: string) => {
      playAlertChime();
      const options: NotificationOptions = {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `jm-alert-${Date.now()}`,
        data: { url: url || window.location.origin },
        requireInteraction: true,
      };

      if (Notification.permission === "granted") {
        if (
          swRegistrationRef.current &&
          "showNotification" in swRegistrationRef.current
        ) {
          swRegistrationRef.current
            .showNotification(title, options)
            .catch(() => {
              try {
                new Notification(title, options);
              } catch {
                // fallback
              }
            });
        } else {
          try {
            new Notification(title, options);
          } catch {
            // fallback
          }
        }
      }
    },
    [],
  );

  // Initialize service worker and SSE live stream
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasNotification = "Notification" in window;
    const hasSW = "serviceWorker" in navigator;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(hasNotification);

    if (hasNotification) {
      setPermission(Notification.permission);
    }

    if (hasSW) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => {
          swRegistrationRef.current = reg;
        })
        .catch(() => {});
    }

    let token = localStorage.getItem("fcm_device_token");
    if (!token) {
      const rand = Math.random().toString(36).substring(2, 10);
      token = `device-${Date.now()}-${rand}`;
      localStorage.setItem("fcm_device_token", token);
    }
    setRegisteredToken(token);

    const { deviceType, deviceName, userAgent } = getDeviceDetails();
    api
      .registerDevice({
        token,
        deviceType,
        deviceName:
          Notification.permission === "granted"
            ? `${deviceName} (Push Active)`
            : deviceName,
        userAgent,
      })
      .catch(() => {});

    // Connect to Server-Sent Events stream for instant OS push alerts
    const streamUrl = `${getApiBaseUrl()}/notifications/stream`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        showNotificationBanner(
          data.title || "Job Notification",
          data.body || "New job notification received",
          data.url,
        );
      } catch (err) {
        console.error("Failed to parse live notification event:", err);
      }
    };

    return () => {
      es.close();
    };
  }, [showNotificationBanner]);

  const requestAndRegister = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window))
      return false;
    setIsRegistering(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setIsRegistering(false);
        return false;
      }

      let token = localStorage.getItem("fcm_device_token");
      if (!token) {
        token = `device-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem("fcm_device_token", token);
      }

      const { deviceType, deviceName, userAgent } = getDeviceDetails();
      await api.registerDevice({
        token,
        deviceType,
        deviceName: `${deviceName} (Push Active)`,
        userAgent,
      });

      showNotificationBanner(
        "🔔 Push Notifications Activated!",
        "You will receive instant alerts for every new job detected.",
      );

      setIsRegistering(false);
      return true;
    } catch (err) {
      console.error("Failed to enable web push:", err);
      setIsRegistering(false);
      return false;
    }
  };

  const broadcastToAll = async (title?: string, body?: string) => {
    return api.broadcastPush({
      title: title || "New Job Opportunity Alert!",
      body:
        body || "A new position has been detected across monitored folders.",
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
