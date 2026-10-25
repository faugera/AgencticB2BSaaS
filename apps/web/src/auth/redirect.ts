// Accept application destinations only, never arbitrary same-origin URLs.
export function safeDestination(value: string | null, fallback: '/app' | '/admin' = '/app'): string {
  if (
    !value ||
    /[\\\s%]/u.test(value) ||
    [...value].some((char) => char.charCodeAt(0) < 32)
  )
    return fallback;
  if (/^\/admin(?:\/organizations|\/members|\/profile|\/security|\/audit|\/workspaces(?:\/[^/?]+)?)?(?:\?|$)/u.test(value)) return value;
  if (fallback === '/admin' && /^\/docs(?:\?|$)/u.test(value)) return value;
  if (!/^\/(?:app|invite)(?:\/|\?|$)/u.test(value)) return fallback;
  return value;
}
