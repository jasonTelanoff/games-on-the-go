/**
 * Shared UI components. One place for the look — screens compose these
 * instead of hand-rolling class strings. Variant/size maps use full class
 * literals so Tailwind's scanner picks them up.
 *
 * Design language: flat, no card boxes. Surfaces are separated by hairline
 * dividers; one accent color, used sparingly; primary actions sit in a
 * sticky bottom bar. Everything is thumb-sized (min 44px targets).
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { dieGlyph } from '../ui.js';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';
type ButtonSize = 'md' | 'sm' | 'face';

const BUTTON_BASE =
  'font-semibold text-ink cursor-pointer transition-colors select-none ' +
  'disabled:opacity-40 disabled:cursor-default w-full';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white active:brightness-110',
  secondary: 'bg-white/[0.07] text-ink active:bg-white/[0.12]',
  text: 'bg-transparent text-accent-soft active:opacity-70',
  danger: 'bg-danger text-white active:brightness-110',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'flex-1 min-h-[52px] px-5 text-[17px] rounded-xl',
  sm: 'min-h-[44px] px-4 text-[15px] rounded-xl',
  face: 'flex-1 h-16 rounded-xl text-[34px] leading-none',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Toggle-selected state (e.g. chosen game, chosen die face). */
  selected?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  selected = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        BUTTON_BASE,
        selected ? 'bg-accent text-white' : BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Layout

/** Page container: owns horizontal padding and bottom room for the sticky bar. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-5 pt-4 pb-6', className)}>{children}</div>;
}

/** Sticky app header: full-bleed, blurred, hairline bottom border. */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 -mx-5 px-5 py-3 mb-2 flex items-center gap-2 bg-night/90 backdrop-blur border-b border-line/60">
      {children}
    </header>
  );
}

/** Sticky bottom action bar: primary actions live here, thumb-reachable. */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 px-1 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-night via-night/95 to-transparent">
      <div className="flex gap-2.5">{children}</div>
    </div>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex items-center gap-2.5', className)}>{children}</div>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px bg-line/60 my-5', className)} aria-hidden />;
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/[0.07] px-2.5 py-1 text-[12px] font-medium text-muted">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Type

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 mb-1 text-[26px] font-semibold tracking-tight">{children}</h1>;
}

export function Sub({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('m-0 mb-4 text-[15px] text-muted', className)}>{children}</p>;
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-muted text-[14px] my-2', className)}>{children}</p>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 mb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
      {children}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-warn-bg/60 border border-warn-line/50 text-warn-ink text-[14px] px-4 py-3 mb-4">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Form

/** Underline-style input: borderless, modern mobile feel. */
export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cx(
        'w-full bg-transparent text-ink text-[18px] py-3 mb-2 outline-none',
        'border-b-2 border-line focus:border-accent placeholder:text-muted/50 transition-colors',
        className,
      )}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------- Dice

export function Die({
  value,
  size = 'md',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cls =
    size === 'lg' ? 'text-[54px] leading-none' : size === 'sm' ? 'text-[26px] leading-none' : 'text-[44px] leading-none';
  return <span className={cls}>{dieGlyph(value)}</span>;
}
