export function resolvePublicPath(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '');

  if (typeof window !== 'undefined') {
    try {
      return new URL(trimmed, window.location.href).toString();
    } catch (error) {
      console.warn('Konnte Pfad nicht relativ zum aktuellen Dokument auflösen, fallback auf Basis-URL', error);
    }
  }

  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$, '/');
  if (base.startsWith('http')) {
    try {
      return new URL(trimmed, base).toString();
    } catch (error) {
      console.warn('Konnte Pfad nicht relativ zur Basis-URL auflösen', error);
    }
  }

  return `${base}${trimmed}`;
}
