/**
 * Avatar registry — the one place avatars are defined. Server validates
 * against it; client renders from it.
 *
 * Jason is drawing the real art. When it lands, swap each `glyph` for an
 * image (e.g. `image: '/avatars/fox.png'`) and update the `Avatar`
 * component in client/src/components/ui.tsx to render an <img> instead.
 * Ids are the stable contract — keep them.
 */
export interface AvatarDef {
  id: string;
  label: string;
  /** Placeholder art until the real drawings land. */
  glyph: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'fox', label: 'Fox', glyph: '🦊' },
  { id: 'panda', label: 'Panda', glyph: '🐼' },
  { id: 'frog', label: 'Frog', glyph: '🐸' },
  { id: 'penguin', label: 'Penguin', glyph: '🐧' },
  { id: 'octopus', label: 'Octopus', glyph: '🐙' },
  { id: 'robot', label: 'Robot', glyph: '🤖' },
  { id: 'ghost', label: 'Ghost', glyph: '👻' },
  { id: 'alien', label: 'Alien', glyph: '👽' },
];

export function isAvatarId(id: string): boolean {
  return AVATARS.some((a) => a.id === id);
}

/** First avatar nobody at the table has claimed, for auto-assignment. */
export function firstFreeAvatar(taken: Set<string>): string {
  return AVATARS.find((a) => !taken.has(a.id))?.id ?? AVATARS[0].id;
}
