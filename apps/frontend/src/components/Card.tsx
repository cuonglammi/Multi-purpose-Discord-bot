import type { PropsWithChildren } from 'react';

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 ${className}`}>{children}</section>;
}

export function CardTitle({ children }: PropsWithChildren) {
  return <h2 className="mb-4 text-lg font-semibold text-white">{children}</h2>;
}
