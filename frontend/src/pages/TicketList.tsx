import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Paginated, Project, Ticket, TicketStatus } from '../lib/types';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge, StatusBadge } from '../components/Badges';
import { Avatar, Skeleton } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { formatDate } from '../lib/format';
import { STATUS_BUCKETS, statusOptionsForRole } from '../lib/statusFlow';

const ALL_STATUSES: TicketStatus[] = ['open', 'in_progress', 'build', 'testing', 'deploy', 'recheck', 'waiting', 'on_hold', 'complete', 'resolved', 'close', 'reopen'];
const PRIORITY_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5'];

export function TicketList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState<Paginated<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  const filters = {
    search: sp.get('search') || '',
    status: sp.get('status') || '',
    priority: sp.get('priority') || '',
    projectId: sp.get('projectId') || '',
    ownerId: sp.get('ownerId') || '',
    tag: sp.get('tag') || '',
    page: Number(sp.get('page') || 1),
  };
  const selectedProjects = filters.projectId ? filters.projectId.split(',').filter(Boolean) : [];
  const statusOptions = user ? statusOptionsForRole(user.role, ALL_STATUSES) : ALL_STATUSES;
  const singleStatus = filters.status.includes(',') ? '' : filters.status;

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  }

  useEffect(() => { api.get('/projects').then((r) => setProjects(r.data.items)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/tickets', { params: { ...filters, page: filters.page, pageSize: 15 } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  return (
    <>
      <div className="page-header">
        <div className="page-title-row">
          <h1 className="page-title">{t('ticket.list')}</h1>
          <div className="page-actions">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/new')}><Icon name="plus" size={16} /> {t('nav.createTicket')}</button>
          </div>
        </div>
      </div>

      <div className="content-scroll">
        {/* Status bucket tabs — easy tracking (Excel row 5) */}
        <div className="pill-tabs">
          {STATUS_BUCKETS.map((b) => {
            const active = filters.status === b.statuses.join(',');
            return (
              <button key={b.key} onClick={() => setFilter('status', b.statuses.join(','))}
                className={`pill-tab ${active ? 'active' : ''}`}>
                {t(`bucket.${b.label}`)}
              </button>
            );
          })}
        </div>

        {/* Filters (sticky) */}
        <div className="card" style={{ padding: 10, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', top: 0, zIndex: 5 }}>
          <div className="header-search" style={{ maxWidth: 260, height: 36 }}>
            <Icon name="search" size={16} />
            <input placeholder={t('common.search')} defaultValue={filters.search} onKeyDown={(e) => { if (e.key === 'Enter') setFilter('search', (e.target as HTMLInputElement).value); }} />
          </div>
          <select className="select" style={{ width: 'auto', minWidth: 170, height: 36 }} value={singleStatus} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {statusOptions.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', minWidth: 150, height: 36 }} value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">{t('common.priority')}: {t('common.all')}</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Multi-project filter (Excel row 30) */}
          <MultiProjectFilter projects={projects} selected={selectedProjects} onChange={(ids) => setFilter('projectId', ids.join(','))} label={t('bucket.projects')} allLabel={t('common.all')} />
        </div>

        {/* Table — 6 columns (priority folded into first cell to make room for Tags) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('ticket.code')} / {t('ticket.title')}</th>
                <th>{t('common.project')}</th>
                <th>{t('ticket.tags')}</th>
                <th>{t('common.owner')}</th>
                <th>{t('common.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('ticket.slaResolve')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><Skeleton height={22} /></td></tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>{t('ticket.empty')}</td></tr>
              )}
              {!loading && data?.items.map((tk) => (
                <tr key={tk.id} onClick={() => navigate(`/tickets/${tk.id}`)}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PriorityBadge level={tk.priority_level} /><b>{tk.code}</b>
                        {tk.escalated && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>ESC</span>}
                      </span>
                      <div className="subline">{tk.title}</div>
                      {tk.customer_name && <div className="subline">👤 {tk.customer_name}</div>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{tk.project_name} {tk.project_priority && <ProjectPriorityBadge value={tk.project_priority} />}</span>
                      <div className="subline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{tk.org_name} {tk.customer_priority && <CustomerPriorityBadge value={tk.customer_priority} />}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 150 }}>
                      {(tk.tags || []).slice(0, 3).map((g) => (
                        <span key={g.id} className="tag-chip" onClick={(e) => { e.stopPropagation(); setFilter('tag', g.name); }} style={{ background: `${g.color}22`, color: g.color, cursor: 'pointer' }}>{g.name}</span>
                      ))}
                      {(tk.tags?.length || 0) > 3 && <span className="subline">+{(tk.tags!.length - 3)}</span>}
                      {!tk.tags?.length && <span className="subline">—</span>}
                    </div>
                  </td>
                  <td>{tk.owner_name ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={tk.owner_name} size={24} />{tk.owner_name}</span> : <span style={{ color: 'var(--text-muted)' }}>{t('common.unassigned')}</span>}</td>
                  <td><StatusBadge status={tk.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {tk.sla.breached ? <span style={{ color: 'var(--error)', fontWeight: 600 }}>{t('ticket.slaBreached')}</span>
                      : tk.sla.atRisk ? <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{t('ticket.slaAtRisk')}</span>
                      : <span className="subline">{formatDate(tk.sla.resolveDeadline, i18n.language)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — sticky */}
        {data && data.pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', position: 'sticky', bottom: 0, background: 'var(--bg-app)', padding: '10px 0', marginTop: 8, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilter('page', String(filters.page - 1))}>‹</button>
            <span style={{ fontSize: 12 }}>{t('common.page')} {data.pagination.page} / {data.pagination.totalPages} · {data.pagination.total} ticket</span>
            <button className="btn btn-secondary btn-sm" disabled={filters.page >= data.pagination.totalPages} onClick={() => setFilter('page', String(filters.page + 1))}>›</button>
          </div>
        )}
      </div>
    </>
  );
}

/** Dropdown with checkboxes to filter by several projects at once. */
function MultiProjectFilter({ projects, selected, onChange, label, allLabel }: {
  projects: Project[]; selected: string[]; onChange: (ids: string[]) => void; label: string; allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const text = selected.length === 0 ? `${label}: ${allLabel}` : `${label}: ${selected.length}`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="select" style={{ width: 200, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-surface)' }} onClick={() => setOpen((o) => !o)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="dropdown-panel" style={{ top: 40, left: 0, width: 260, maxHeight: 300, overflowY: 'auto' }}>
          {selected.length > 0 && <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => onChange([])}>✕ {allLabel}</button>}
          {projects.map((p) => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name} <span className="subline">· {p.org_name}</span></span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
