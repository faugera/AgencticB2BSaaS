import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n';
import { Button } from './primitives';

export function PageNavigation({
  nextCursor,
  busy,
  onLoadMore,
}: {
  nextCursor: string | null;
  busy: boolean;
  onLoadMore: () => Promise<{ count: number; hasMore: boolean }>;
}) {
  const { t } = useLanguage();
  const [hasPages, setHasPages] = useState(nextCursor !== null);
  const [status, setStatus] = useState('');
  const statusRef = useRef<HTMLParagraphElement>(null);
  const focusStatus = useRef(false);
  useEffect(() => {
    if (focusStatus.current) {
      focusStatus.current = false;
      statusRef.current?.focus();
    }
  }, [status]);
  if (!hasPages) return null;
  return (
    <div aria-busy={busy}>
      <Button
        type="button"
        variant="secondary"
        disabled={!nextCursor || busy}
        onClick={() => {
          setHasPages(true);
          setStatus(t('loading'));
          void onLoadMore()
            .then(({ count, hasMore }) => {
              focusStatus.current = !hasMore;
              setStatus(
                count
                  ? `${count} ${t('results_loaded')}`
                  : t('no_more_results'),
              );
            })
            .catch(() => setStatus(t('pagination_failed')));
        }}
      >
        {t('load_more')}
      </Button>
      <p
        ref={statusRef}
        className="ui-pagination-status"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        {status}
      </p>
    </div>
  );
}
