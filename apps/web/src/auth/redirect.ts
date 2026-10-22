// Accept application destinations only, never arbitrary same-origin URLs.
export function safeDestination(value: string | null): string {
  if (
    !value ||
    /[\\\s%]/u.test(value) ||
    [...value].some((char) => char.charCodeAt(0) < 32)
  )
    return '/app';
  if (!/^\/(?:app|invite)(?:\/|\?|$)/u.test(value)) return '/app';
  return value;
}
