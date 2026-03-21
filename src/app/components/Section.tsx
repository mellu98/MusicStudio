'use client';

export default function Section({
  children,
  className,
  innerClassName
}: {
  children?: React.ReactNode | string;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section className={`mx-auto w-full px-4 lg:px-0 ${className ?? ""}`}>
      <div className={`mx-auto max-w-3xl ${innerClassName ?? ""}`}>{children}</div>
    </section>
  );
}
