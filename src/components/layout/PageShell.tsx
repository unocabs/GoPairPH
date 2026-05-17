import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  withPattern?: boolean;
}

export function PageShell({
  children,
  className,
  contentClassName,
  withPattern = true,
}: PageShellProps) {
  return (
    <div className={cn('relative min-h-full overflow-hidden bg-[#020617]', className)}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 18% 8%, rgba(20,184,166,0.12), transparent 30%), radial-gradient(circle at 84% 18%, rgba(56,189,248,0.06), transparent 26%), linear-gradient(135deg, #020617 0%, #07111f 44%, #031a18 100%)',
        }}
      />
      {withPattern && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(255,255,255,0.9) 0.7px, transparent 0.7px)',
              backgroundSize: '4px 4px',
            }}
          />
        </>
      )}
      <div className={cn('relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
