import type { ReactNode } from 'react';
import type { SaveStatus } from '../data/m2Data';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Button({ children, onClick, variant = 'primary', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean }) {
  const cls = variant === 'primary' ? 'bg-slate-900 text-white' : variant === 'secondary' ? 'border border-slate-300 bg-white text-slate-900' : 'bg-slate-100 text-slate-700';
  return <button type="button" disabled={disabled} onClick={onClick} className={`w-full rounded-2xl px-4 py-3 font-bold disabled:opacity-50 ${cls}`}>{children}</button>;
}

export function Header({ step, title, subtitle }: { step?: string; title: string; subtitle?: string }) {
  return <header className="mb-4">{step && <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">{step}</div>}<h1 className="text-xl font-extrabold text-slate-950">{title}</h1>{subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}</header>;
}

export function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="block"><div className="mb-2 text-sm font-bold">{label}</div><textarea className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

export function Select({ title, selected, onClick, desc }: { title: string; selected: boolean; onClick: () => void; desc?: string }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left font-bold ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div>{title}</div>{desc && <div className={`mt-1 text-sm leading-6 ${selected ? 'text-slate-200' : 'text-slate-600'}`}>{desc}</div>}</button>;
}

export function Save({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const msg = status === 'saving' ? '저장 중입니다.' : status === 'saved' ? '저장되었습니다.' : status === 'failed' ? '저장이 지연되고 있습니다.' : '작성 중인 내용이 임시 저장되었습니다.';
  return <div className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">{msg}</div>;
}
