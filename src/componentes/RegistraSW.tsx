"use client";
import { useEffect } from "react";

/** Registra o service worker COM ESCOPO /app/. Montado so no layout do painel. */
export function RegistraSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw-app.js", { scope: "/app/" })
      .catch(() => { /* sem PWA o painel continua funcionando */ });
  }, []);
  return null;
}
