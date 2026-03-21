import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex w-full justify-center border-t border-[rgba(18,49,42,0.12)] bg-[rgba(18,49,42,0.96)] px-4 py-5 text-sm text-[#f6ede1]/72 lg:px-0">
      <p className="flex w-full max-w-6xl items-center justify-between gap-4">
        <span>Genera, ascolta e porta la tua mini app in tasca.</span>
        <span className="flex items-center gap-2">
          <span>© 2026</span>
          <Link href="https://github.com/gcui-art/suno-api/">gcui-art/suno-api</Link>
        </span>
      </p>
    </footer>
  );
}
