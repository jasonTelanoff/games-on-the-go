/**
 * Shared UI components. One place for the look — screens compose these
 * instead of hand-rolling class strings. Variant/size maps use full class
 * literals so Tailwind's scanner picks them up.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { dieGlyph } from '../ui.js';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------- Button

type ButtonVariant = 'ghost' | 'primary' | 'danger';
type ButtonSize = 'md' | 'sm' | 'face';

const BUTTON_BASE =
  'min-h-[52px] rounded-[10px] px-4 py-3 text-[17px] font-semibold text-ink ' +
  'cursor-pointer transition-transform active:scale-[0.98] ' +
  'disabled:opacity-40 disabled:cursor-default disabled:active:scale-100';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  ghost: 'bg-line',
  primary: 'bg-accent text-white',
  danger: 'bg-danger text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'flex-1',
  sm: 'flex-none w-[52px] text-2xl',
  face: 'flex-1 py-2 text-[30px] leading-none',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Toggle-selected state (e.g. chosen game, chosen die face). */
  selected?: boolean;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  selected = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(BUTTON_BASE, selected ? 'bg-accent text-white' : BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Layout

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('bg-card border border-line rounded-[14px] p-5 mb-4', className)}>
      {children}
    </div>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex items-center gap-2.5', className)}>{children}</div>;
}

export function TopBar({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 mb-3">{children}</div>;
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="bg-deep border border-line rounded-full px-3 py-1.5 text-[13px] text-muted">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Type

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 mb-1 text-[28px]">{children}</h1>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="m-0 mb-4 text-muted">{children}</p>;
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-muted text-sm my-2', className)}>{children}</p>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block mt-3.5 mb-1.5 text-[13px] uppercase tracking-[0.08em] text-muted">
      {children}
    </label>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="bg-warn-bg border border-warn-line text-warn-ink rounded-[10px] p-3 mb-3">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Form

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cx(
        'w-full p-3.5 text-[17px] rounded-[10px] border border-line bg-deep text-ink mb-1',
        className,
      )}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------- Dice

export function Die({ value, small = false }: { value: number; small?: boolean }) {
  return <span className={small ? 'text-[26px] leading-none' : 'text-[46px] leading-none'}>{dieGlyph(value)}</span>;
}
