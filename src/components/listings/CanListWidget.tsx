'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

type LocationChoice = 'pampanga' | 'nearby' | 'farther';
type ServiceOption = 'meetup' | 'delivery' | 'shipping';

interface CanListWidgetProps {
  showCta?: boolean;
  compact?: boolean;
}

const locationChoices: ReadonlyArray<{
  value: LocationChoice;
  label: string;
}> = [
  { value: 'pampanga', label: "I'm in Pampanga" },
  { value: 'nearby', label: "I'm nearby (Central Luzon & NCR)" },
  { value: 'farther', label: "I'm farther away" },
];

const serviceOptions: ReadonlyArray<{
  value: ServiceOption;
  label: string;
}> = [
  { value: 'meetup', label: 'Can meet up in/near Pampanga' },
  { value: 'delivery', label: 'Can deliver to Pampanga' },
  { value: 'shipping', label: 'Can ship to Pampanga' },
];

export function CanListWidget({ showCta = false, compact = false }: CanListWidgetProps) {
  const [location, setLocation] = useState<LocationChoice>('pampanga');
  const [services, setServices] = useState<ServiceOption[]>(['meetup']);

  const result = useMemo(() => {
    if (location === 'pampanga') {
      return {
        tone: 'positive' as const,
        title: 'Yes, you can list.',
        text: 'Go Pair PH is built around Pampanga runners.',
      };
    }

    if (services.length > 0) {
      return {
        tone: 'positive' as const,
        title: 'Yes, you can list.',
        text: 'You can list if Pampanga buyers can realistically receive the pair.',
      };
    }

    return {
      tone: 'warning' as const,
      title: 'You may still list.',
      text: 'Buyers may have a hard time completing the deal. Add meetup, delivery, or shipping details if possible.',
    };
  }, [location, services.length]);

  function toggleService(value: ServiceOption) {
    setServices((current) =>
      current.includes(value)
        ? current.filter((service) => service !== value)
        : [...current, value],
    );
  }

  return (
    <SurfaceCard glow className={cn('relative overflow-hidden p-5', compact && 'p-4')}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(20,184,166,0.13),transparent_36%)]" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          Pampanga-first, not Pampanga-only
        </p>
        <h2 className={cn('mt-2 font-bold text-gray-100', compact ? 'text-lg' : 'text-xl sm:text-2xl')}>
          Can I list on Go Pair PH?
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Local sellers are ideal. Nearby sellers are welcome if they can serve Pampanga buyers.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Where are you selling from?
            </p>
            <div className={cn('mt-2 grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-3')}>
              {locationChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setLocation(choice.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                    location === choice.value
                      ? 'border-teal-400/60 bg-teal-400/12 text-teal-100'
                      : 'border-white/[0.08] bg-slate-950/55 text-gray-300 hover:border-teal-400/30 hover:bg-slate-900',
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              How can buyers receive the pair?
            </p>
            <div className="mt-2 space-y-2">
              {serviceOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2.5 text-sm text-gray-300 transition-colors hover:border-teal-400/30 hover:bg-slate-900/70"
                >
                  <input
                    type="checkbox"
                    checked={services.includes(option.value)}
                    onChange={() => toggleService(option.value)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-950"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'mt-5 rounded-xl border px-4 py-3',
            result.tone === 'positive'
              ? 'border-teal-400/30 bg-teal-400/10'
              : 'border-amber-400/30 bg-amber-400/10',
          )}
        >
          <p className={cn('text-sm font-bold', result.tone === 'positive' ? 'text-teal-200' : 'text-amber-200')}>
            {result.title}
          </p>
          <p className={cn('mt-1 text-sm leading-6', result.tone === 'positive' ? 'text-teal-50/80' : 'text-amber-50/85')}>
            {result.text}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            If buyers can meet, receive delivery, or arrange shipping with you, your pair is welcome on Go Pair PH.
          </p>
        </div>

        {showCta && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              List Your Running Shoes
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-800 hover:text-gray-100"
            >
              See Marketplace
            </Link>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
