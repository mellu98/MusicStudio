import Link from "next/link";
import Logo from "./Logo";

export default function Header() {
  return (
    <nav className="app-shell sticky top-0 z-40 flex w-full justify-center border-b border-[rgba(18,49,42,0.12)] bg-[rgba(251,246,238,0.82)] px-4 py-4 backdrop-blur-2xl lg:px-0">
      <div className="flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xl font-semibold tracking-tight text-[var(--primary)]">
          <Logo className="h-5 w-5" />
          <Link href="/">Suno Pocket Studio</Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-[var(--primary)]/85">
          <p className="rounded-full px-3 py-2 transition duration-200 hover:bg-[rgba(18,49,42,0.08)] lg:px-5">
            <Link href="/">Studio</Link>
          </p>
          <p className="rounded-full px-3 py-2 transition duration-200 hover:bg-[rgba(18,49,42,0.08)] lg:px-5">
            <Link href="/docs">Docs</Link>
          </p>
          <p className="rounded-full bg-[var(--primary)] px-4 py-2 text-[#fcf7ef] shadow-lg shadow-[rgba(18,49,42,0.18)] transition hover:bg-[#1c473d]">
            <a href="https://github.com/mellu98/MusicStudio" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </nav>
  );
}
