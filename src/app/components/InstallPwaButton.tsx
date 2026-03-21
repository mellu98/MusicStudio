'use client';

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    const syncStandalone = () => {
      setIsStandalone(mediaQuery.matches || nav.standalone === true);
    };

    syncStandalone();
    setShowIosHint(isIos && !(mediaQuery.matches || nav.standalone === true));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      syncStandalone();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", syncStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", syncStandalone);
    };
  }, []);

  if (isStandalone) {
    return (
      <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-[#f6ede1]/90 ring-1 ring-white/10">
        App installata
      </span>
    );
  }

  if (installPrompt) {
    return (
      <button
        type="button"
        className="inline-flex items-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b140f] shadow-lg shadow-[rgba(230,135,77,0.3)] transition hover:-translate-y-0.5 hover:bg-[#f09c66]"
        onClick={async () => {
          await installPrompt.prompt();
          await installPrompt.userChoice;
          setInstallPrompt(null);
        }}
      >
        Installa la PWA
      </button>
    );
  }

  if (showIosHint) {
    return (
      <p className="max-w-xs text-sm text-[#f6ede1]/78">
        Su iPhone puoi installarla da Safari con Condividi → Aggiungi a Home.
      </p>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-[#f6ede1]/72 ring-1 ring-white/10">
      Installazione disponibile dal browser supportato
    </span>
  );
}
