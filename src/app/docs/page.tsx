import Section from "../components/Section";

const supportedRoutes = [
  {
    method: "POST",
    path: "/api/generate",
    description: "Avvia un job semplice da prompt e restituisce subito un task id da monitorare."
  },
  {
    method: "POST",
    path: "/api/custom_generate",
    description: "Avvia un job custom con titolo, stile e lyrics."
  },
  {
    method: "GET",
    path: "/api/get?ids=taskId1,taskId2",
    description: "Recupera lo stato dei task e, quando pronti, audio, cover e lyrics."
  },
  {
    method: "GET",
    path: "/api/get_limit",
    description: "Legge il saldo crediti configurato tramite `SUNOAPI_KEY`."
  }
];

export default function Docs() {
  return (
    <Section className="py-10 lg:py-14" innerClassName="max-w-4xl">
      <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Docs</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--primary)]">
          API supportata in questa build
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Questa versione di Suno Pocket Studio usa <code>sunoapi.org</code> come provider server-side.
          La PWA e il deploy Render supportano in modo ufficiale le route qui sotto, senza cookie Suno,
          Playwright o servizi CAPTCHA.
        </p>

        <div className="mt-8 grid gap-4">
          {supportedRoutes.map(route => (
            <article
              key={`${route.method}-${route.path}`}
              className="rounded-[1.4rem] border border-[rgba(18,49,42,0.1)] bg-[var(--surface-strong)] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--primary)]">
                  {route.method}
                </span>
                <code className="text-sm text-[var(--primary)]">{route.path}</code>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{route.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[1.4rem] border border-[rgba(230,135,77,0.24)] bg-[rgba(230,135,77,0.1)] p-5 text-sm leading-6 text-[var(--foreground)]">
          Le altre route legacy presenti nel repository non fanno parte del flusso supportato su Render per questa
          build. Per l&apos;uso quotidiano della PWA considera supportate solo le quattro route sopra.
        </div>
      </div>
    </Section>
  );
}
