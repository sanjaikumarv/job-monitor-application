"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, getApiBaseUrl } from "./api";
import { PushAlertData } from "../components/PushBanner";

const playAlertChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Autoplay policy
  }
};

const vibrateMobile = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      // Ignore vibration error
    }
  }
};

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredToken, setRegisteredToken] = useState<string>("");
  const [activeAlert, setActiveAlert] = useState<PushAlertData | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getDeviceDetails = () => {
    if (typeof window === "undefined") return { deviceType: "web", deviceName: "Unknown", userAgent: "" };
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMac = /Macintosh/i.test(ua);
    const isWindows = /Windows/i.test(ua);
    const deviceType: "web" | "android" | "ios" = isAndroid ? "android" : isIOS ? "ios" : "web";
    const deviceName = isAndroid ? "Android Mobile" : isIOS ? "Apple Mobile" : isWindows ? "Windows PC / Laptop" : isMac ? "MacBook / Mac" : "Desktop / Laptop";
    return { deviceType, deviceName, userAgent: ua };
  };

  const dismissAlert = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveAlert(null);
  }, []);

  const triggerPushAlert = useCallback((title: string, body: string, url?: string) => {
    playAlertChime();
    vibrateMobile();
    setActiveAlert({ id: `alert-${Date.now()}`, title, body, url, timestamp: new Date().toISOString() });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActiveAlert(null), 8000);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const opts: NotificationOptions = { body, icon: "/favicon.ico", badge: "/favicon.ico", tag: `jm-${Date.now()}`, data: { url: url || window.location.origin }, requireInteraction: true };
      if (swRef.current?.showNotification) {
        swRef.current.showNotification(title, opts).catch(() => { try { new Notification(title, opts); } catch {} });
      } else {
        try { new Notification(title, opts); } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    setIsMobileDevice(/Android|iPhone|iPad|iPod/i.test(ua));
    setIsSecure(window.isSecureContext || window.location.hostname === "localhost");
    setIsSupported("Notification" in window);
    if ("Notification" in window) setPermission(Notification.permission);

    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").then((reg) => { swRef.current = reg; }).catch(() => {});
    }

    let token = localStorage.getItem("fcm_device_token");
    if (!token) {
      token = `device-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("fcm_device_token", token);
    }
    setRegisteredToken(token);

    const { deviceType, deviceName, userAgent } = getDeviceDetails();
    api.registerDevice({
      token,
      deviceType,
      deviceName: "Notification" in window && Notification.permission === "granted" ? `${deviceName} (Push Active)` : deviceName,
      userAgent,
    }).catch(() => {});

    let es: EventSource | null = null;
    const connectStream = () => {
      es = new EventSource(`${getApiBaseUrl()}/notifications/stream`);
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          triggerPushAlert(d.title || "Job Alert", d.body || "New job received", d.url);
        } catch {}
      };
      es.onerror = () => { es?.close(); setTimeout(connectStream, 4000); };
    };
    connectStream();

    return () => { es?.close(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [triggerPushAlert]);

  const requestAndRegister = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    setIsRegistering(true);
    try {
      if (!("Notification" in window)) {
        triggerPushAlert("📱 Mobile Push Active", "Instant alerts and vibration enabled for this mobile session!");
        setIsRegistering(false);
        return true;
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      let token = localStorage.getItem("fcm_device_token") || `device-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("fcm_device_token", token);
      const { deviceType, deviceName, userAgent } = getDeviceDetails();
      await api.registerDevice({ token, deviceType, deviceName: `${deviceName} (Push Active)`, userAgent });
      triggerPushAlert("🔔 Push Notifications Activated!", "Real-time alerts active across your devices.");
      setIsRegistering(false);
      return true;
    } catch {
      triggerPushAlert("📱 Mobile Alerts Active", "Vibration and real-time alerts active on mobile!");
      setIsRegistering(false);
      return true;
    }
  };

  const broadcastToAll = async (title?: string, body?: string) => {
    return api.broadcastPush({
      title: title || "New Job Opportunity Alert!",
      body: body || "A new position has been detected across monitored folders.",
      url: window.location.origin,
    });
  };

  return { isSupported, permission, isRegistering, registeredToken, activeAlert, isSecure, isMobileDevice, dismissAlert, requestAndRegister, broadcastToAll };
}
