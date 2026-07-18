import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { CustomerPriorityBadge, PriorityBadge } from '../components/Badges';

type Tab = 'sla' | 'orgs' | 'users';

export function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('sla');
  const [sla, setSla] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/sla').then((r) => setSla(r.data)).catch(() => {});
    api.get('/orgs').then((r) => setOrgs(r.data.items)).catch(() => {});
    api.get('/projects').then((r) => setProjects(r.data.items)).catch(() => {});
    api.get('/users').then((r) => setUsers(r.data.items)).catch(() => {});
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'sla', label: t('nav.sla') },
    { key: 'orgs', label: t('nav.orgs') },
    { key: 'users', label: t('nav.users') },
  ];

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('nav.admin')}</h1></div></div>
      <div className="content-scroll">
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{ background: 'none', border: 'none', padding: '8px 0', borderBottom: tab === tb.key ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === tb.key ? 'var(--color-primary)' : 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'sla' && sla && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>{t('common.priority')}</th><th>Platinum ×0.5</th><th>Gold ×0.75</th><th>Silver ×1</th><th>Bronze ×1.5</th></tr></thead>
              <tbody>
                {['P1', 'P2', 'P3', 'P4', 'P5'].map((lvl) => (
                  <tr key={lvl} style={{ cursor: 'default' }}>
                    <td><PriorityBadge level={lvl as any} /> <span className="subline">base {sla.base[lvl].responseHours}h/{sla.base[lvl].resolveHours}h</span></td>
                    {['platinum', 'gold', 'silver', 'bronze'].map((cp) => {
                      const cell = sla.matrix.find((m: any) => m.priority_level === lvl && m.customer_priority === cp);
                      return <td key={cp}>{cell ? `${Number(cell.response_hours)}h / ${Number(cell.resolve_hours)}h` : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'orgs' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {orgs.map((o) => (
              <div key={o.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{o.name}</b><CustomerPriorityBadge value={o.customer_priority} />
                </div>
                <div className="subline">{o.code} · {o.project_count} projects</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
                  {projects.filter((p) => p.org_id === o.id).map((p) => (
                    <div key={p.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.name} <span className="subline">({p.project_priority})</span></span>
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
              <thead><tr><th>{t('common.customer')}</th><th>Email</th><th>Role</th><th>Lang</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td><b>{u.name}</b></td><td>{u.email}</td><td>{t(`roles.${u.role}`)}</td><td>{u.language?.toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
