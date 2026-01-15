export function bindHotkey(handler: (e: KeyboardEvent) => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
