import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Label({ children }: PropsWithChildren) {
  return <label className="mb-1 block text-sm font-medium text-slate-300">{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-indigo-500/40 focus:ring-2 ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-indigo-500/40 focus:ring-2 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-indigo-500/40 focus:ring-2 ${props.className ?? ''}`} />;
}

export function Button({ children, className = '', ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button {...props} className={`rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}
