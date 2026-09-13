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
import { AVATARS } from '../../../src/avatars.js';

export function cx(...parts: Array<string | false | null | undefined>): string {
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
  // No flex-1 here: as a direct child of a column flex container it would
  // stretch vertically (that's how "Back to lobby" filled the screen).
  // Row layouts opt into growing with their own flex classes.
  md: 'min-h-[52px] px-5 text-[17px] rounded-xl',
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

export function Notice({ children, isExiting }: { children: ReactNode; isExiting?: boolean }) {
  return (
    <div className={cx('fixed top-4 left-5 right-5 z-50 rounded-xl bg-warn-bg border border-warn-line/50 text-warn-ink text-[14px] px-4 py-3', isExiting ? 'animate-slide-up' : 'animate-slide-down')}>
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

// ---------------------------------------------------------------- Avatar

/**
 * Renders an avatar by id from the shared registry. When Jason's art
 * lands, this is the one place that switches from glyph to <img>.
 */
export function Avatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const def = AVATARS.find((a) => a.id === id) ?? AVATARS[0];
  const cls =
    size === 'lg' ? 'text-[44px] leading-none' : size === 'sm' ? 'text-[22px] leading-none' : 'text-[30px] leading-none';
  return (
    <span className={cls} role="img" aria-label={def.label}>
      {def.glyph}
    </span>
  );
}

// ---------------------------------------------------------------- Dice

// ------------------------------------------------------------------- Die

/** Pip maps on a 3x3 grid, row-major. */
const PIPS: Record<number, number[]> = {
  1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
  3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
  5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
};

const DIE_BOX: Record<string, string> = {
  sm: 'w-[26px] h-[26px] p-[4px]',
  md: 'w-[40px] h-[40px] p-[6px]',
  lg: 'w-[56px] h-[56px] p-[9px]',
};

const DIE_PIP: Record<string, string> = {
  sm: 'w-[5px] h-[5px]',
  md: 'w-[8px] h-[8px]',
  lg: 'w-[11px] h-[11px]',
};

/**
 * A real drawn die — fixed geometry at every size, so pips never clip
 * the border the way font glyphs do. White die, ink pips.
 */
export function Die({
  value,
  size = 'md',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const pips = PIPS[value] ?? PIPS[1];
  return (
    <span
      className={cx(
        'inline-grid grid-cols-3 grid-rows-3 flex-none select-none',
        'rounded-[26%] bg-[#eef0f3]',
        'shadow-[inset_0_-2px_3px_rgba(0,0,0,0.18)]',
        DIE_BOX[size],
      )}
      aria-label={`Die showing ${value}`}
    >
      {pips.map((on, i) => (
        <span className="flex items-center justify-center" key={i}>
          {on === 1 && <span className={cx('rounded-full bg-[#1d2129]', DIE_PIP[size])} />}
        </span>
      ))}
    </span>
  );
}
