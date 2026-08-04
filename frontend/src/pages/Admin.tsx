import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge } from '../components/Badges';
import { UserFormModal } from '../components/UserFormModal';
import { OrgProjectModal } from '../components/OrgProjectModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';

const P_LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
const C_TIERS = ['platinum', 'gold', 'silver', 'bronze'] as const;
const cellKey = (lvl: string, cp: string) => `${lvl}:${cp}`;

type Tab = 'sla' | 'orgs' | 'users';

export function Admin() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const isCustomerAdmin = user?.role === 'customer_admin';
  const canEditUsers = user?.role === 'super_admin' || user?.role === 'csm';
  const canCreateUsers = canEditUsers || isCustomerAdmin;
  const canManageOrgs = canEditUsers; // super_admin / csm

  const [tab, setTab] = useState<Tab>(isCustomerAdmin ? 'users' : 'sla');
  const [sla, setSla] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userModal, setUserModal] = useState<string | null | undefined>(undefined); // undefined=closed, null=create
  const [orgModal, setOrgModal] = useState<'org' | 'project' | null>(null);
  // Editable SLA matrix state
  const [editSla, setEditSla] = useState(false);
  const [draft, setDraft] = useState<Record<string, { response: string; resolve: string }>>({});
  const [savingSla, setSavingSla] = useState(false);

  function loadSla() { return api.get('/admin/sla').then((r) => setSla(r.data)).catch(() => {}); }
  function seedDraft(data: any) {
    const d: Record<string, { response: string; resolve: string }> = {};
    for (const lvl of P_LEVELS) for (const cp of C_TIERS) {
      const cell = data.matrix.find((m: any) => m.priority_level === lvl && m.customer_priority === cp);
      d[cellKey(lvl, cp)] = { response: String(Number(cell?.response_hours ?? '')), resolve: String(Number(cell?.resolve_hours ?? '')) };
    }
    setDraft(d);
  }
  function startEditSla() { if (sla) { seedDraft(sla); setEditSla(true); } }
  async function saveSla() {
    const cells: any[] = [];
    for (const lvl of P_LEVELS) for (const cp of C_TIERS) {
      const v = draft[cellKey(lvl, cp)];
      const response = Number(v?.response), resolve = Number(v?.resolve);
      if (!(response > 0) || !(resolve > 0)) { toast(t('sla.invalid'), 'error'); return; }
      cells.push({ priorityLevel: lvl, customerPriority: cp, responseHours: response, resolveHours: resolve });
    }
    setSavingSla(true);
    try {
      await api.patch('/admin/sla', { cells });
      await loadSla();
      setEditSla(false);
      toast(t('sla.saved'), 'success');
    } catch { toast(t('common.error'), 'error'); }
    finally { setSavingSla(false); }
  }
  async function resetSla() {
    setSavingSla(true);
    try { await api.post('/admin/sla/reset'); await loadSla(); setEditSla(false); toast(t('sla.reset'), 'success'); }
    catch { toast(t('common.error'), 'error'); }
    finally { setSavingSla(false); }
  }

  function loadUsers() { api.get('/users').then((r) => setUsers(r.data.items)).catch(() => {}); }
  function loadOrgs() {
    api.get('/orgs').then((r) => setOrgs(r.data.items)).catch(() => {});
    api.get('/projects').then((r) => setProjects(r.data.items)).catch(() => {});
  }

  useEffect(() => {
    if (!isCustomerAdmin) api.get('/admin/sla').then((r) => setSla(r.data)).catch(() => {});
    loadOrgs();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS: { key: Tab; label: string }[] = isCustomerAdmin
    ? [{ key: 'users', label: t('nav.users') }]
    : [
        { key: 'sla', label: t('nav.sla') },
        { key: 'orgs', label: t('nav.orgs') },
        { key: 'users', label: t('nav.users') },
      ];

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('nav.admin')}</h1>
        <div className="page-actions">
          {tab === 'sla' && canEditUsers && !editSla && (
            <button className="btn btn-primary btn-sm" onClick={startEditSla}><Icon name="settings" size={16} /> {t('sla.edit')}</button>
          )}
          {tab === 'sla' && canEditUsers && editSla && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={resetSla} disabled={savingSla}>{t('sla.resetDefault')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditSla(false)} disabled={savingSla}>{t('common.cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={saveSla} disabled={savingSla}>{savingSla ? <span className="spinner" /> : t('common.save')}</button>
            </>
          )}
          {tab === 'users' && canCreateUsers && (
            <button className="btn btn-primary btn-sm" onClick={() => setUserModal(null)}><Icon name="plus" size={16} /> {t('userMgmt.create')}</button>
          )}
          {tab === 'orgs' && canManageOrgs && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setOrgModal('org')}><Icon name="plus" size={16} /> {t('orgMgmt.createOrg')}</button>
              <button className="btn btn-primary btn-sm" onClick={() => setOrgModal('project')}><Icon name="plus" size={16} /> {t('orgMgmt.createProject')}</button>
            </>
          )}
        </div>
      </div></div>
      <div className="content-scroll">
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{ background: 'none', border: 'none', padding: '8px 0', borderBottom: tab === tb.key ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === tb.key ? 'var(--color-primary)' : 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'sla' && sla && (
          <>
            <div className="subline" style={{ marginBottom: 10 }}>
              {t('sla.hint')} · {t('sla.projectFactorNote')}: critical ×{sla.projectFactor.critical}, high ×{sla.projectFactor.high}, medium ×{sla.projectFactor.medium}, low ×{sla.projectFactor.low}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="table">
                <thead><tr>
                  <th>{t('common.priority')}</th>
                  <th>Platinum ×0.5</th><th>Gold ×0.75</th><th>Silver ×1</th><th>Bronze ×1.5</th>
                </tr></thead>
                <tbody>
                  {P_LEVELS.map((lvl) => (
                    <tr key={lvl} style={{ cursor: 'default' }}>
                      <td><PriorityBadge level={lvl as any} /> <span className="subline">{t('sla.responseResolve')}</span></td>
                      {C_TIERS.map((cp) => {
                        const k = cellKey(lvl, cp);
                        if (editSla) {
                          const v = draft[k] || { response: '', resolve: '' };
                          const upd = (field: 'response' | 'resolve', val: string) =>
                            setDraft((d) => ({ ...d, [k]: { ...d[k], [field]: val } }));
                          return (
                            <td key={cp}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input className="input" style={{ width: 58, height: 30, padding: '0 6px', textAlign: 'center' }} type="number" min="0" step="0.25" value={v.response} onChange={(e) => upd('response', e.target.value)} />
                                <span className="subline">/</span>
                                <input className="input" style={{ width: 58, height: 30, padding: '0 6px', textAlign: 'center' }} type="number" min="0" step="0.25" value={v.resolve} onChange={(e) => upd('resolve', e.target.value)} />
                                <span className="subline">h</span>
                              </div>
                            </td>
                          );
                        }
                        const cell = sla.matrix.find((m: any) => m.priority_level === lvl && m.customer_priority === cp);
                        return <td key={cp}>{cell ? `${Number(cell.response_hours)}h / ${Number(cell.resolve_hours)}h` : '—'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'orgs' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {orgs.map((o) => (
              <div key={o.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{o.name}</b><CustomerPriorityBadge value={o.customer_priority} />
                </div>
                <div className="subline">{o.code} · {o.project_count} projects</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  {projects.filter((p) => p.org_id === o.id).map((p) => (
                    <div key={p.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{p.name} <ProjectPriorityBadge value={p.project_priority} /></span>
                      {p.jira_url && <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>Jira</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>{t('userMgmt.name')}</th><th>Email</th><th>{t('userMgmt.role')}</th><th>Lang</th><th style={{ textAlign: 'right' }}>{t('common.actions')}</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>{t(`roles.${u.role}`)}</span>
                      {u.dev_level && <span className="tag-chip" style={{ marginLeft: 6, background: 'var(--bg-sunken)', color: 'var(--text-secondary)', fontWeight: 700 }}>L{u.dev_level}</span>}
                    </td>
                    <td>{u.language?.toUpperCase()}</td>
                    <td style={{ textAlign: 'right' }}>
                      {canEditUsers && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setUserModal(u.id)}>{t('userMgmt.edit')}</button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>{t('common.noData')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {userModal !== undefined && (
        <UserFormModal
          userId={userModal}
          orgs={orgs}
          projects={projects}
          currentRole={user!.role}
          onClose={() => setUserModal(undefined)}
          onSaved={loadUsers}
        />
      )}
      {orgModal && (
        <OrgProjectModal mode={orgModal} orgs={orgs} onClose={() => setOrgModal(null)} onSaved={loadOrgs} />
      )}
    </>
  );
}
