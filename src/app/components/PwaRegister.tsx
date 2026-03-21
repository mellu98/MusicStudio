'use client';

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent fail: the app still works as a normal web app.
    });
  }, []);

  return null;
}
