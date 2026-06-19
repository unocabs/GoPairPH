import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'neutral' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:pointer-events-none disabled:opacity-40',
          {
            'bg-teal-500 text-white hover:bg-teal-400 shadow-lg shadow-teal-500/20': variant === 'primary',
            'border border-sky-500/50 bg-sky-700 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-600 focus-visible:ring-sky-400': variant === 'secondary',
            'border border-sky-500/45 bg-sky-500/10 text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/20 focus-visible:ring-sky-400': variant === 'outline',
            'border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-gray-100': variant === 'neutral',
            'text-gray-400 hover:bg-gray-800 hover:text-gray-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20': variant === 'danger',
            'px-2.5 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
