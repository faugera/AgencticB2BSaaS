import { isIP } from 'node:net';

export function trustedProxies(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => {
    const [address, prefix, extra] = entry.trim().split('/');
    const version = isIP(address ?? '');
    if (
      !version ||
      extra ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) < 8 ||
          Number(prefix) > (version === 4 ? 32 : 128)))
    ) {
      throw new Error(
        'TRUSTED_PROXIES must contain explicit IPs or restricted CIDRs',
      );
    }
    return entry.trim();
  });
}
