/**
 * Go Pair PH — Brand mark (Direction 2B: Chevron)
 *
 * Forward-facing chevron silhouette with "GP" set in heavy italic.
 * Self-contained SVG; no external assets.
 *
 * Two component shapes are exported:
 *
 *   <LogoMark size={32} />            // icon only, numeric px size
 *   <Logo size="md" />                // backward-compatible default lockup
 *                                     //  (icon + "Go Pair PH" wordmark, "sm" | "md" | "lg")
 *   <Logo size={40} withWordmark />   // numeric px override; wordmark on/off
 */

type SizePreset = 'sm' | 'md' | 'lg';

interface LogoProps {
  /** "sm" (24px) | "md" (28px, default) | "lg" (40px) — or a raw px number */
  size?: SizePreset | number;
  /** Render the "Go Pair PH" wordmark beside the icon. Default: true (matches old API). */
  withWordmark?: boolean;
  /** Use light wordmark colors (for dark backgrounds). Default true. */
  inverted?: boolean;
  className?: string;
  /** Override the chevron fill (defaults to brand teal-700). */
  fill?: string;
  /** Override the GP letterform fill (defaults to white). */
  letterFill?: string;
}

const PRESET_PX: Record<SizePreset, number> = { sm: 24, md: 28, lg: 40 };

function resolveSize(size: SizePreset | number | undefined): number {
  if (typeof size === 'number') return size;
  return PRESET_PX[size ?? 'md'];
}

export function LogoMark({
  size = 32,
  fill = '#0d9488',
  letterFill = '#ffffff',
}: Pick<LogoProps, 'size' | 'fill' | 'letterFill'>) {
  const px = resolveSize(size);
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Go Pair PH"
    >
      <path d="M 6 8 H 46 L 60 32 L 46 56 H 6 L 20 32 Z" fill={fill} />
      <path d="M 12 14 H 40" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.6" />
      <text
        x="30"
        y="42"
        textAnchor="middle"
        fontFamily="Helvetica Neue, Arial Black, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="24"
        fill={letterFill}
        letterSpacing="-1"
      >
        GP
      </text>
    </svg>
  );
}

export function Logo({
  size = 'md',
  withWordmark = true,
  inverted = true,
  className,
  fill,
  letterFill,
}: LogoProps) {
  const px = resolveSize(size);

  if (!withWordmark) {
    return (
      <span className={className}>
        <LogoMark size={px} fill={fill} letterFill={letterFill} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={px} fill={fill} letterFill={letterFill} />
      <span
        className="font-bold tracking-tight leading-none"
        style={{ fontSize: Math.round(px * 0.64) }}
      >
        <span className={inverted ? 'text-gray-100' : 'text-gray-900'}>Go Pair</span>
        <span className="text-teal-400"> PH</span>
      </span>
    </span>
  );
}

export default Logo;
