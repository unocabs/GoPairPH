import { cn } from '@/lib/utils';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  glow?: boolean;
  hover?: boolean;
}

export function SurfaceCard({
  as: Component = 'div',
  glow = false,
  hover = false,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <Component
      className={cn(
        'rounded-xl border border-white/[0.08] bg-slate-900/72 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm',
        glow && 'shadow-[0_22px_70px_rgba(0,0,0,0.36),0_0_48px_rgba(20,184,166,0.08)]',
        hover && 'transition-all hover:-translate-y-0.5 hover:border-teal-400/35 hover:bg-slate-900/86 hover:shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_54px_rgba(20,184,166,0.1)]',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
