// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureNavigation } from '../admin/AdminSidebar';

function hrefs(admin: boolean, options: Partial<Parameters<typeof FeatureNavigation>[0]> = {}) {
  const { container } = render(
    <MemoryRouter>
      <FeatureNavigation
        admin={admin}
        manager={false}
        canAudit={false}
        canRoles={false}
        canInvite={false}
        organizationAdmin={false}
        query=""
        t={(key) => key}
        onNavigate={() => {}}
        {...options}
      />
    </MemoryRouter>,
  );
  return [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'));
}

describe('FeatureNavigation', () => {
  it('renders only platform links on the admin surface', () => {
    const links = hrefs(true);
    expect(links).toContain('/admin/organizations');
    expect(links).toContain('/admin/members');
    expect(links).toContain('/admin/roles');
    expect(links.some((href) => href?.startsWith('/app'))).toBe(false);
  });

  it('renders tenant links allowed by permissions and keeps the tenant scope', () => {
    const links = hrefs(false, { manager: true, canInvite: true, canRoles: false, canAudit: false, query: '?tenantId=tenant-1' });
    expect(links).toContain('/app/members?tenantId=tenant-1');
    expect(links).toContain('/app/invitations?tenantId=tenant-1');
    expect(links).toContain('/app/security?tenantId=tenant-1');
    expect(links).not.toContain('/app/roles?tenantId=tenant-1');
    expect(links).not.toContain('/app/audit?tenantId=tenant-1');
    expect(links.some((href) => href?.startsWith('/admin'))).toBe(false);
  });
});
