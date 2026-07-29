import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Paginated, Ticket, TicketStatus } from '../lib/types';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge, StatusBadge } from '../components/Badges';
import { Avatar, Skeleton } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { formatDate } from '../lib/format';

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'build', 'testing', 'deploy', 'recheck', 'waiting', 'on_hold', 'complete', 'resolved', 'close', 'reopen'];
const PRIORITY_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5'];

export function TicketList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState<Paginated<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const filters = {
    search: sp.get('search') || '',
    status: sp.get('status') || '',
    priority: sp.get('priority') || '',
    projectId: sp.get('projectId') || '',
    page: Number(sp.get('page') || 1),
  };

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  }

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/tickets', { params: { ...filters, page: filters.page, pageSize: 15 } })
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
        {/* Filters */}
        <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="header-search" style={{ maxWidth: 280, height: 36 }}>
            <Icon name="search" size={16} />
            <input placeholder={t('common.search')} defaultValue={filters.search} onKeyDown={(e) => { if (e.key === 'Enter') setFilter('search', (e.target as HTMLInputElement).value); }} />
          </div>
          <select className="select" style={{ width: 160, height: 36 }} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <select className="select" style={{ width: 140, height: 36 }} value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">{t('common.priority')}: {t('common.all')}</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="select" style={{ width: 180, height: 36 }} value={filters.projectId} onChange={(e) => setFilter('projectId', e.target.value)}>
            <option value="">{t('common.project')}: {t('common.all')}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Table (max 6 cols per design convention) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('ticket.code')} / {t('ticket.title')}</th>
                <th>{t('common.project')}</th>
                <th>{t('common.priority')}</th>
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
                    <b>{tk.code}</b> {tk.escalated && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>ESC</span>}
                    <div className="subline">{tk.title}</div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{tk.project_name} {tk.project_priority && <ProjectPriorityBadge value={tk.project_priority} />}</span>
                    <div className="subline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{tk.org_name} {tk.customer_priority && <CustomerPriorityBadge value={tk.customer_priority} />}</div>
                  </td>
                  <td><PriorityBadge level={tk.priority_level} /></td>
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

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilter('page', String(filters.page - 1))}>‹</button>
            <span style={{ fontSize: 12 }}>{t('common.page')} {data.pagination.page} / {data.pagination.totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={filters.page >= data.pagination.totalPages} onClick={() => setFilter('page', String(filters.page + 1))}>›</button>
          </div>
        )}
      </div>
    </>
  );
}
