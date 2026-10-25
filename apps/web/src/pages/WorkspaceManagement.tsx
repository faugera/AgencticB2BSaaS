import type { FormEvent } from 'react';
import type { Workspace } from '@enterprise/shared';
import { Link } from 'react-router-dom';
import { api } from '../http';
import { useLanguage } from '../i18n';
import type { Member } from './InvitationManagement';

type Props = {
 selected: Workspace | null; workspaces: readonly Workspace[]; members: readonly Member[];
 admin: boolean; superAdmin: boolean; scope: string; query: string; basePath: string; busy: boolean;
 submit: (event: FormEvent<HTMLFormElement>, run: (form: FormData) => Promise<unknown>) => void;
 action: (run: () => Promise<unknown>) => Promise<void>;
};
export function WorkspaceManagement({ selected, workspaces, members, admin, superAdmin, scope, query, basePath, busy, submit, action }: Props) {
 const { t } = useLanguage();
 const text = (form: FormData, key: string) => String(form.get(key) ?? '');
 return (
                <section
                  className={selected ? 'panel workspace-panel' : 'panel'}
                >
                  <h2>{selected ? selected.name : t('your_workspaces')}</h2>
                  {selected ? (
                    <p>{t('this_workspace_is_authorized_by_the_server')}</p>
                  ) : (
                    <ul className="workspace-list">
                      {workspaces.map((space) => (
                        <li key={space.id}>
                          <Link to={basePath + '/workspaces/' + space.id + query}>
                            {space.name}{' '}
                            <span>
                              {space.visibility === 'private'
                                ? t('private')
                                : t('organization')}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!selected && !workspaces.length && (
                    <p>
                      {t(
                        'no_accessible_workspace_ask_your_administrator_for_access',
                      )}
                    </p>
                  )}
                  {admin && (!superAdmin || scope) && (
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api('/api/workspaces' + query, {
                            name: text(form, 'name'),
                          }),
                        )
                      }
                    >
                      <label>
                        {t('new_private_workspace')}
                        <input name="name" required maxLength={100} />
                      </label>
                      <button disabled={busy}>{t('create_workspace')}</button>
                    </form>
                  )}
                  {selected?.can_manage && (
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api(
                            '/api/workspaces/' +
                              selected.id +
                              '/members' +
                              query,
                            {
                              actorId: text(form, 'actor'),
                              role: text(form, 'role'),
                            },
                          ),
                        )
                      }
                    >
                      <h3>{t('assign_access')}</h3>
                      <label>
                        {t('member')}
                        <select name="actor" required>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t('role')}
                        <select name="role">
                          <option value="member">{t('member')}</option>
                          <option value="workspace_admin">
                            {t('workspace_administrator')}
                          </option>
                        </select>
                      </label>
                      <button disabled={busy}>{t('save')}</button>
                    </form>
                  )}
                  {selected?.can_manage && (
                    <>
                      <form
                        onSubmit={(e) =>
                          submit(e, (form) =>
                            api(
                              '/api/workspaces/' + selected.id + query,
                              {
                                name: text(form, 'name'),
                                visibility: text(form, 'visibility'),
                              },
                              'PATCH',
                            ),
                          )
                        }
                      >
                        <label>
                          {t('workspace_name')}
                          <input
                            name="name"
                            defaultValue={selected.name}
                            key={selected.name}
                            required
                            maxLength={100}
                          />
                        </label>
                        <label>
                          {t('visibility')}
                          <select
                            name="visibility"
                            defaultValue={selected.visibility}
                          >
                            <option value="private">{t('private')}</option>
                            <option value="tenant">{t('organization')}</option>
                          </select>
                        </label>
                        <button disabled={busy}>{t('save')}</button>
                      </form>
                      <ul>
                        {members
                          .filter((member) => member.role)
                          .map((member) => (
                            <li key={member.id}>
                              {member.name}
                              <button
                                disabled={busy}
                                onClick={() => {
                                  void action(() =>
                                    api(
                                      '/api/workspaces/' +
                                        selected.id +
                                        '/members/' +
                                        member.id +
                                        query,
                                      undefined,
                                      'DELETE',
                                    ),
                                  );
                                }}
                              >
                                {t('remove_from_workspace')}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </section>
 );
}
