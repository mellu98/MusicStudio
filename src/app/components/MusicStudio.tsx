'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import InstallPwaButton from "./InstallPwaButton";
import Section from "./Section";

type Track = {
  id: string;
  title?: string;
  image_url?: string;
  lyric?: string;
  audio_url?: string;
  video_url?: string;
  created_at?: string;
  model_name?: string;
  prompt?: string;
  tags?: string;
  negative_tags?: string;
  status?: string;
  error_message?: string;
};

type Quota = {
  credits_left: number;
  period: string;
  monthly_limit: number;
  monthly_usage: number;
};

type FormState = {
  prompt: string;
  title: string;
  tags: string;
  lyrics: string;
  negativeTags: string;
  makeInstrumental: boolean;
};

const DRAFT_KEY = "suno-pocket-draft";
const LATEST_RESULTS_KEY = "suno-pocket-results";
const FINISHED_STATUSES = new Set(["streaming", "complete", "error"]);
const PLAYABLE_STATUSES = new Set(["streaming", "complete"]);

const DEFAULT_FORM: FormState = {
  prompt: "",
  title: "",
  tags: "",
  lyrics: "",
  negativeTags: "",
  makeInstrumental: false
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short"
});

function delay(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function readStoredValue<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getTrackStatusLabel(status?: string) {
  const normalizedStatus = (status ?? "").toLowerCase();

  if (normalizedStatus === "complete") return "Completo";
  if (normalizedStatus === "streaming") return "Pronto";
  if (normalizedStatus === "error") return "Errore";
  if (normalizedStatus === "submitted") return "Inviato";
  if (normalizedStatus === "queued") return "In coda";
  return status || "In lavorazione";
}

function formatTrackDate(value?: string) {
  if (!value) {
    return "Adesso";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

export default function MusicStudio() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [results, setResults] = useState<Track[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "submitting" | "polling" | "done">("idle");
  const [statusMessage, setStatusMessage] = useState("Scrivi un'idea e facciamola diventare una canzone.");
  const [isHydrated, setIsHydrated] = useState(false);

  const activeJobRef = useRef(0);

  const usesCustomMode = useMemo(() => {
    return [form.title, form.tags, form.lyrics, form.negativeTags].some(value => value.trim().length > 0);
  }, [form.title, form.tags, form.lyrics, form.negativeTags]);

  const canSubmit = form.prompt.trim().length > 0 || form.lyrics.trim().length > 0;
  const hasPlayableResult = results.some(track => {
    return PLAYABLE_STATUSES.has((track.status ?? "").toLowerCase()) && Boolean(track.audio_url);
  });

  useEffect(() => {
    setIsHydrated(true);
    const savedDraft = readStoredValue<FormState>(DRAFT_KEY);
    const savedResults = readStoredValue<Track[]>(LATEST_RESULTS_KEY);

    if (savedDraft) {
      setForm({
        ...DEFAULT_FORM,
        ...savedDraft
      });
    }

    if (savedResults && savedResults.length > 0) {
      setResults(savedResults);
      setStatusMessage("Ho ricaricato l'ultima generazione salvata su questo dispositivo.");
      setPhase("done");
    }

    void refreshQuota();

    return () => {
      activeJobRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (results.length > 0 && phase === "done") {
      window.localStorage.setItem(LATEST_RESULTS_KEY, JSON.stringify(results));
    }
  }, [results, phase, isHydrated]);

  async function refreshQuota() {
    try {
      setQuotaError(null);
      const response = await fetch("/api/get_limit", {
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setQuota(null);
        setQuotaError(payload?.error || "Server non ancora configurato.");
        return;
      }

      setQuota(payload as Quota);
    } catch {
      setQuota(null);
      setQuotaError("Impossibile leggere la quota in questo momento.");
    }
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }

  async function pollTracks(ids: string[], jobId: number) {
    const query = encodeURIComponent(ids.join(","));

    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (activeJobRef.current !== jobId) {
        return;
      }

      await delay(attempt === 0 ? 2400 : 4200);

      if (activeJobRef.current !== jobId) {
        return;
      }

      if (attempt > 0 && attempt < 4) {
        setStatusMessage("Suno ha preso in carico i clip. Sto aspettando audio e copertine...");
      } else if (attempt >= 4) {
        setStatusMessage("La generazione è in corso. Appena i file sono pronti li trovi qui sotto.");
      }

      try {
        const response = await fetch(`/api/get?ids=${query}`, {
          cache: "no-store"
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (attempt > 2) {
            setError(payload?.error || "Errore nel recupero dello stato della generazione.");
            setPhase("done");
          }
          continue;
        }

        const nextResults = Array.isArray(payload) ? (payload as Track[]) : [];
        if (nextResults.length === 0) {
          continue;
        }

        setResults(nextResults);

        const allFinished = nextResults.every(track =>
          FINISHED_STATUSES.has((track.status ?? "").toLowerCase())
        );
        const somePlayable = nextResults.some(track =>
          PLAYABLE_STATUSES.has((track.status ?? "").toLowerCase()) && Boolean(track.audio_url)
        );

        if (allFinished) {
          setPhase("done");
          setStatusMessage(
            somePlayable
              ? "Canzone pronta: puoi ascoltare i clip e copiare i dati da qui."
              : "La generazione si è chiusa senza clip riproducibili."
          );
          void refreshQuota();
          return;
        }

        if (somePlayable) {
          setStatusMessage("Almeno un clip è già pronto: puoi iniziare ad ascoltarlo.");
        }
      } catch {
        if (attempt > 2) {
          setError("Connessione instabile mentre monitoravo lo stato dei clip.");
        }
      }
    }

    if (activeJobRef.current === jobId) {
      setPhase("done");
      setStatusMessage("Timeout raggiunto. I clip potrebbero essere ancora in lavorazione su Suno.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Inserisci almeno una descrizione o un testo da mettere in musica.");
      return;
    }

    const jobId = Date.now();
    activeJobRef.current = jobId;

    setError(null);
    setResults([]);
    setPhase("submitting");
    setStatusMessage(
      usesCustomMode
        ? "Invio una generazione custom con titolo, stile e testo."
        : "Invio la richiesta a Suno con il tuo prompt."
    );

    const endpoint = usesCustomMode ? "/api/custom_generate" : "/api/generate";
    const payload = usesCustomMode
      ? {
          prompt: form.lyrics.trim() || form.prompt.trim(),
          tags: form.tags.trim(),
          title: form.title.trim(),
          negative_tags: form.negativeTags.trim(),
          make_instrumental: form.makeInstrumental,
          wait_audio: false
        }
      : {
          prompt: form.prompt.trim(),
          make_instrumental: form.makeInstrumental,
          wait_audio: false
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setPhase("idle");
        setError(body?.error || "La generazione non è partita.");
        setStatusMessage("Qualcosa ha fermato la richiesta prima dell'avvio.");
        return;
      }

      const freshResults = Array.isArray(body) ? (body as Track[]) : [];

      if (freshResults.length === 0) {
        setPhase("idle");
        setError("Suno non ha restituito clip da monitorare.");
        return;
      }

      setResults(freshResults);
      setPhase("polling");
      setStatusMessage("Clip creati. Adesso seguo lo stato finché l'audio è pronto.");

      const ids = freshResults.map(track => track.id).filter(Boolean);
      if (ids.length > 0) {
        await pollTracks(ids, jobId);
      }
    } catch {
      setPhase("idle");
      setError("Non riesco a raggiungere il server. Controlla che l'app sia online.");
      setStatusMessage("La richiesta non è partita.");
    }
  }

  function clearLatestSession() {
    activeJobRef.current += 1;
    setResults([]);
    setError(null);
    setPhase("idle");
    setStatusMessage("Sessione pulita. Quando vuoi possiamo generare un nuovo brano.");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LATEST_RESULTS_KEY);
    }
  }

  return (
    <Section className="pb-14 pt-8 lg:pb-20 lg:pt-10" innerClassName="max-w-6xl">
      <div className="app-shell flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="warm-panel rounded-[2rem] px-6 py-7 lg:px-8 lg:py-9">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f7efe3]/74">
                PWA music studio
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#f6ede1]/70">
                Next.js + Suno API
              </span>
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#fff8ef] md:text-5xl">
                Crea una mini app che genera canzoni e ascoltale subito dal telefono.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#f4ebdf]/78 md:text-lg">
                Questa home ora è il tuo studio: mandi prompt o lyrics, il frontend segue la generazione
                e quando Suno chiude i clip trovi player, cover e testo già pronti.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <InstallPwaButton />
              <a
                href="#studio-form"
                className="inline-flex items-center rounded-full border border-white/14 px-5 py-3 text-sm font-medium text-[#fff7ed] transition hover:bg-white/8"
              >
                Apri il form
              </a>
            </div>
          </section>

          <div className="grid gap-6">
            <section className="glass-panel rounded-[1.75rem] p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Quota</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--primary)]">Stato account</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[rgba(18,49,42,0.12)] px-3 py-2 text-sm text-[var(--primary)] transition hover:bg-[rgba(18,49,42,0.04)]"
                  onClick={() => void refreshQuota()}
                >
                  Aggiorna
                </button>
              </div>
              {quota ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] bg-[var(--surface-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Crediti</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{quota.credits_left}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--surface-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Periodo</p>
                    <p className="mt-2 text-xl font-semibold capitalize text-[var(--primary)]">{quota.period}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--surface-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Uso mensile</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--primary)]">
                      {quota.monthly_usage}/{quota.monthly_limit}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.25rem] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[var(--foreground)]">
                  {quotaError || "Se qui non vedi la quota, configura prima SUNO_COOKIE e TWOCAPTCHA_KEY."}
                </div>
              )}
            </section>

            <section className="glass-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Workflow</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] bg-[var(--surface-strong)] p-4">
                  <p className="text-sm font-semibold text-[var(--primary)]">1. Descrivi il brano</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Prompt rapido o modalità custom con titolo, stile e lyrics.
                  </p>
                </div>
                <div className="rounded-[1.2rem] bg-[var(--surface-strong)] p-4">
                  <p className="text-sm font-semibold text-[var(--primary)]">2. Lascia che la PWA segua il job</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Il client polla lo stato e ti mostra quando i clip diventano ascoltabili.
                  </p>
                </div>
                <div className="rounded-[1.2rem] bg-[var(--surface-strong)] p-4">
                  <p className="text-sm font-semibold text-[var(--primary)]">3. Ascolta e riapri l&apos;ultima sessione</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    L&apos;ultimo risultato resta salvato sul dispositivo per ripartire in fretta.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section id="studio-form" className="glass-panel rounded-[2rem] p-6 lg:p-7">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Generatore</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--primary)]">Imposta il brano</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Se compili almeno uno tra titolo, stile, testo o negative tags userò automaticamente la modalità custom.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--primary)]">Idea o prompt</span>
                <div className="field-shell rounded-[1.2rem] p-1">
                  <textarea
                    value={form.prompt}
                    onChange={event => updateField("prompt", event.target.value)}
                    rows={5}
                    placeholder="Esempio: synth pop malinconico, voce femminile, ritornello enorme, mood da guida notturna."
                    className="min-h-[140px] w-full resize-y rounded-[1rem] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/75"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--primary)]">Titolo</span>
                  <div className="field-shell rounded-[1.2rem] p-1">
                    <input
                      value={form.title}
                      onChange={event => updateField("title", event.target.value)}
                      placeholder="Neon Drive"
                      className="w-full rounded-[1rem] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/75"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--primary)]">Style / tags</span>
                  <div className="field-shell rounded-[1.2rem] p-1">
                    <input
                      value={form.tags}
                      onChange={event => updateField("tags", event.target.value)}
                      placeholder="synthwave, cinematic, male vocal"
                      className="w-full rounded-[1rem] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/75"
                    />
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--primary)]">Lyrics o testo completo</span>
                <div className="field-shell rounded-[1.2rem] p-1">
                  <textarea
                    value={form.lyrics}
                    onChange={event => updateField("lyrics", event.target.value)}
                    rows={7}
                    placeholder="Se vuoi controllare di più il risultato, incolla qui il testo della canzone."
                    className="min-h-[170px] w-full resize-y rounded-[1rem] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/75"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--primary)]">Negative tags</span>
                  <div className="field-shell rounded-[1.2rem] p-1">
                    <input
                      value={form.negativeTags}
                      onChange={event => updateField("negativeTags", event.target.value)}
                      placeholder="no trap hats, no distortion"
                      className="w-full rounded-[1rem] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/75"
                    />
                  </div>
                </label>

                <label className="flex min-h-[58px] items-center gap-3 rounded-[1.25rem] border border-[rgba(18,49,42,0.12)] bg-[var(--surface-strong)] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.makeInstrumental}
                    onChange={event => updateField("makeInstrumental", event.target.checked)}
                    className="h-4 w-4 rounded border-[rgba(18,49,42,0.3)] text-[var(--primary)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--primary)]">Solo strumentale</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit || phase === "submitting" || phase === "polling"}
                  className="inline-flex items-center rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[#fcf7ef] shadow-lg shadow-[rgba(18,49,42,0.16)] transition hover:-translate-y-0.5 hover:bg-[#1d4b40] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {phase === "submitting" || phase === "polling" ? "Generazione in corso..." : "Genera canzone"}
                </button>
                <button
                  type="button"
                  onClick={clearLatestSession}
                  className="inline-flex items-center rounded-full border border-[rgba(18,49,42,0.14)] px-5 py-3 text-sm font-medium text-[var(--primary)] transition hover:bg-[rgba(18,49,42,0.04)]"
                >
                  Pulisci sessione
                </button>
                <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--primary)]">
                  {usesCustomMode ? "Modalità custom attiva" : "Modalità prompt semplice"}
                </span>
              </div>
            </form>
          </section>

          <section className="glass-panel rounded-[2rem] p-6 lg:p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Output</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--primary)]">Risultati e stato</h2>
              </div>
              <div className="rounded-[1.25rem] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)]">
                <p className="font-medium text-[var(--primary)]">Stato corrente</p>
                <p className="mt-1 text-[var(--muted)]">{statusMessage}</p>
              </div>
            </div>

            {error ? (
              <div className="mb-5 rounded-[1.3rem] border border-[rgba(230,135,77,0.24)] bg-[rgba(230,135,77,0.1)] px-4 py-4 text-sm leading-6 text-[var(--foreground)]">
                {error}
              </div>
            ) : null}

            {results.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-[rgba(18,49,42,0.16)] bg-[rgba(255,253,249,0.56)] px-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">In attesa</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--primary)]">Il prossimo brano apparirà qui</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
                  Quando invii il form, questa colonna mostra l&apos;avanzamento dei clip e appena possibile
                  inserisce player audio, cover, lyrics e metadati.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-[var(--primary)]">
                    {results.length} clip
                  </span>
                  <span className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-[var(--primary)]">
                    {hasPlayableResult ? "Riproduzione disponibile" : "Ancora in lavorazione"}
                  </span>
                </div>

                {results.map(track => (
                  <article
                    key={track.id}
                    className="overflow-hidden rounded-[1.75rem] border border-[rgba(18,49,42,0.1)] bg-[var(--surface-strong)]"
                  >
                    <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[220px] bg-[linear-gradient(180deg,rgba(18,49,42,0.82),rgba(230,135,77,0.48))]">
                        {track.image_url ? (
                          <img
                            src={track.image_url}
                            alt={track.title || "Cover generata"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-end p-5">
                            <div className="rounded-[1.2rem] bg-black/18 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/78">
                              Cover in arrivo
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-2xl font-semibold tracking-tight text-[var(--primary)]">
                              {track.title || "Nuovo clip"}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {formatTrackDate(track.created_at)} · ID {track.id}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
                            {getTrackStatusLabel(track.status)}
                          </span>
                        </div>

                        {track.audio_url ? (
                          <audio controls className="w-full">
                            <source src={track.audio_url} />
                          </audio>
                        ) : (
                          <div className="rounded-[1rem] border border-dashed border-[rgba(18,49,42,0.14)] px-4 py-3 text-sm text-[var(--muted)]">
                            L&apos;audio non è ancora disponibile. Sto continuando a monitorarlo.
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1.2rem] bg-[rgba(18,49,42,0.04)] p-4 text-sm">
                            <p className="font-medium text-[var(--primary)]">Prompt</p>
                            <p className="mt-2 whitespace-pre-wrap leading-6 text-[var(--muted)]">
                              {track.prompt || "Prompt non restituito da Suno."}
                            </p>
                          </div>
                          <div className="rounded-[1.2rem] bg-[rgba(18,49,42,0.04)] p-4 text-sm">
                            <p className="font-medium text-[var(--primary)]">Dettagli</p>
                            <div className="mt-2 space-y-2 leading-6 text-[var(--muted)]">
                              <p><strong className="text-[var(--primary)]">Model:</strong> {track.model_name || "default"}</p>
                              <p><strong className="text-[var(--primary)]">Tags:</strong> {track.tags || "nessuno"}</p>
                              <p><strong className="text-[var(--primary)]">Negative:</strong> {track.negative_tags || "nessuno"}</p>
                              {track.video_url ? (
                                <p>
                                  <strong className="text-[var(--primary)]">Video:</strong>{" "}
                                  <a
                                    className="underline decoration-[var(--accent)] underline-offset-4"
                                    href={track.video_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Apri il video
                                  </a>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {track.lyric ? (
                          <div className="rounded-[1.2rem] bg-[rgba(18,49,42,0.04)] p-4 text-sm">
                            <p className="font-medium text-[var(--primary)]">Lyrics</p>
                            <pre className="mt-2 whitespace-pre-wrap break-words bg-transparent p-0 font-inherit leading-6 text-[var(--muted)]">
                              {track.lyric}
                            </pre>
                          </div>
                        ) : null}

                        {track.error_message ? (
                          <div className="rounded-[1.2rem] border border-[rgba(173,59,34,0.12)] bg-[rgba(173,59,34,0.08)] p-4 text-sm leading-6 text-[var(--foreground)]">
                            {track.error_message}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Section>
  );
}
