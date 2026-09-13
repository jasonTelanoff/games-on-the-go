/**
 * Tiny timestamped logger. Default level is `info`; set LOG_LEVEL=debug
 * for per-message tracing (every inbound client message and event).
 * Levels: debug < info < warn < error.
 */
export type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function configuredLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as Level[]).includes(raw as Level)
    ? (raw as Level)
    : 'info';
}

const THRESHOLD = ORDER[configuredLevel()];

function emit(level: Level, msg: string): void {
  if (ORDER[level] < THRESHOLD) return;
  const time = new Date().toTimeString().slice(0, 8);
  const line = `[${time}] ${msg}`;
  if (level === 'warn' || level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string) => emit('debug', msg),
  info: (msg: string) => emit('info', msg),
  warn: (msg: string) => emit('warn', msg),
  error: (msg: string) => emit('error', msg),
};
