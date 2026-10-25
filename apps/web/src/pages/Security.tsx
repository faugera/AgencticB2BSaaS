import { useState } from 'react';
import { authClient } from '../auth/client';
import type { UIMessage } from '../i18n';

export function Security({ t }: { t: (key: UIMessage) => string }) {
  const { data: session } = authClient.useSession();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await operation();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      setPassword('');
    }
  }
  return (
    <section className="panel">
      <h2>{t('two_factor_authentication_optional')}</h2>
      <p>{t('use_a_totp_authenticator_and_keep_recovery_codes_offline')}</p>
      {error && <p role="alert">{t('verification_failed_try_again')}</p>}
      {!setup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (session?.user.twoFactorEnabled) {
                const result = await authClient.twoFactor.disable({ password });
                if (result.error) throw new Error();
              } else {
                const result = await authClient.twoFactor.enable({ password });
                if (
                  result.error ||
                  !result.data ||
                  result.data.method !== 'totp'
                )
                  throw new Error();
                setSetup(result.data);
              }
            });
          }}
        >
          <label>
            {t('current_password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy}>
            {session?.user.twoFactorEnabled
              ? t('disable_mfa')
              : t('set_up_mfa')}
          </button>
        </form>
      ) : (
        <>
          <p>
            {t(
              'add_this_uri_to_your_authenticator_then_confirm_a_code_do_not_sh',
            )}
          </p>
          <code className="secret">{setup.totpURI}</code>
          <h3>{t('recovery_codes')}</h3>
          <ul>
            {setup.backupCodes.map((backup) => (
              <li key={backup}>
                <code>{backup}</code>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await authClient.twoFactor.verifyTotp({ code });
                if (result.error) throw new Error();
                setSetup(null);
                setCode('');
              });
            }}
          >
            <label>
              {t('verification_code')}
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button disabled={busy}>{t('confirm')}</button>
          </form>
        </>
      )}
    </section>
  );
}

