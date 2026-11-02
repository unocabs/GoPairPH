'use client';
import Link from 'next/link';
import { buildMessengerUrl } from '@/lib/facebook';
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function MessageSellerButton({ href, messengerUrl, className, label = 'Message Seller', children, style, ariaLabel, disabled = false }: {
  href: string; messengerUrl?: string | null; className?: string; label?: string;
  children?: ReactNode; style?: CSSProperties; ariaLabel?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); previous?.focus(); };
  }, [open]);
  const buttonClass = className ?? 'inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-500/35 bg-sky-950/40 px-4 py-3 text-sm font-semibold text-sky-100 hover:bg-sky-900/50';
  const external = buildMessengerUrl(messengerUrl);
  const accessibleLabel = ariaLabel ?? label;
  const content = children ?? label;
  if (!external) return disabled
    ? <button type="button" disabled className={buttonClass} style={style} aria-label={accessibleLabel}>{content}</button>
    : <Link href={href} prefetch={false} className={buttonClass} style={style} aria-label={accessibleLabel} title={accessibleLabel}>{content}</Link>;
  return <>
    <button type="button" className={buttonClass} style={style} aria-label={accessibleLabel} title={accessibleLabel} aria-haspopup="dialog" disabled={disabled} onClick={() => setOpen(true)}>{content}</button>
    {open && createPortal(<dialog ref={dialog} onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }} aria-labelledby={titleId} className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-xl backdrop:bg-black/70">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id={titleId} className="font-semibold">{label}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close chat options" className="min-h-11 min-w-11 rounded-lg hover:bg-gray-800">✕</button></div>
      <Link href={href} onClick={() => setOpen(false)} className="block rounded-xl bg-teal-500 px-4 py-3 font-semibold text-gray-950 hover:bg-teal-400">Chat on Go Pair PH<span className="mt-1 block text-xs font-normal">Keep messages and offers together.</span></Link>
      <a href={external} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="mt-3 block rounded-xl border border-gray-700 px-4 py-3 font-semibold hover:bg-gray-800">Chat on Messenger<span className="mt-1 block text-xs font-normal text-gray-400">Continue in Messenger.</span></a>
    </dialog>, document.body)}
  </>;
}
