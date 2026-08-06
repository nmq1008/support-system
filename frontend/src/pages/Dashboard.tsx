import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { BarChart, DonutChart, Gauge, LineChart } from '../components/Charts';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { Skeleton } from '../components/Avatar';

type Mode = 'today' | 'week' | 'custom';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<Mode>('week');
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  function computeParams() {
    const now = new Date();
    if (mode === 'today') {
      const d = now.toISOString().slice(0, 10);
      return { from: d, to: d };
    }
    if (mode === 'week') {
      const from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
      return { from, to: now.toISOString().slice(0, 10) };
    }
    return { from: range.from || undefined, to: range.to || undefined };
  }

  async function load() {
    const params = computeParams();
    const r = await api.get('/dashboard', { params });
    setData(r.data);
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.emit('dashboard:subscribe');
    const handler = () => load();
    socket.on('ticket:changed', handler);
    return () => { socket.emit('dashboard:unsubscribe'); socket.off('ticket:changed', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, range.from, range.to]);

  const s = data?.summary;

  const STAT = [
    { key: 'total', value: s?.total, color: 'var(--color-primary)' },
    { key: 'inProgress', value: s?.inProgress, color: '#F97316' },
    { key: 'waitingPickup', value: s?.waitingPickup, color: '#E0A45C' },
    { key: 'newToday', value: s?.newToday, color: '#C77856' },
    { key: 'slaBreached', value: s?.slaBreached, color: '#EF4444' },
    { key: 'reopenRate', value: s ? `${s.reopenRate}%` : undefined, color: '#DC2626' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-title-row">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <div className="page-actions">
            {(['today', 'week', 'custom'] as Mode[]).map((m) => (
              <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode(m)}>
                {t(`common.${m === 'today' ? 'today' : m === 'week' ? 'thisWeek' : 'customRange'}`)}
              </button>
            ))}
            {mode === 'custom' && (
              <>
                <input className="input" style={{ width: 168, height: 34 }} type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
                <input className="input" style={{ width: 168, height: 34 }} type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="content-scroll">
        {/* Summary widgets */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {STAT.map((st) => (
            <div key={st.key} className="stat-card">
              {st.value === undefined ? <Skeleton height={30} width={60} /> : <div className="stat-value" style={{ color: st.color }}>{st.value}</div>}
              <div className="stat-label">{t(`dashboard.${st.key}`)}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginTop: 16 }}>
          <div className="card">
            <h3 className="card-title">{t('dashboard.byStatus')}</h3>
            {data ? <DonutChart data={data.byStatus.filter((x: any) => x.count > 0).map((x: any) => ({ label: t(`status.${x.status}`), value: x.count, color: x.color }))} /> : <Skeleton height={160} />}
          </div>
          <div className="card">
            <h3 className="card-title">{t('dashboard.byPriority')}</h3>
            {data ? <BarChart data={data.byPriority.map((x: any) => ({ label: x.priority, value: x.count, color: x.color }))} /> : <Skeleton height={180} />}
          </div>
          <div className="card">
            <h3 className="card-title">{t('dashboard.slaCompliance')}</h3>
            {data ? (
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <Gauge value={s.slaCompliance} />
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12 }}><b style={{ color: 'var(--success)' }}>{Math.max(0, s.total - s.slaBreached)}</b> {t('dashboard.onTime')}</span>
                  <span style={{ fontSize: 12 }}><b style={{ color: 'var(--error)' }}>{s.slaBreached}</b> {t('dashboard.late')}</span>
                </div>
                <div className="subline" style={{ marginTop: 4, textAlign: 'center' }}>{t('dashboard.slaHint')}</div>
              </div>
            ) : <Skeleton height={120} />}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', marginTop: 16 }}>
          <div className="card">
            <h3 className="card-title">{t('dashboard.timeline')}</h3>
            {data ? <LineChart data={data.timeline} /> : <Skeleton height={200} />}
          </div>
          <div className="card">
            <h3 className="card-title">{t('dashboard.byProject')}</h3>
            {data ? <BarChart data={data.byProject.map((x: any, i: number) => ({ label: x.project, value: x.count, color: ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DB2777'][i % 5] }))} /> : <Skeleton height={180} />}
          </div>
        </div>

        {/* Workload + Escalation */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', marginTop: 16 }}>
          <div className="card">
            <h3 className="card-title">{t('dashboard.workload')}</h3>
            <table className="table">
              <thead><tr><th>{t('common.owner')}</th><th style={{ textAlign: 'right' }}>{t('dashboard.openTickets')}</th><th style={{ textAlign: 'right' }}>P1/P2</th><th style={{ textAlign: 'right' }}>SLA</th></tr></thead>
              <tbody>
                {data?.workload?.length ? data.workload.map((w: any) => (
                  // Click a staff row → their in-progress ticket list (Excel row 10)
                  <tr key={w.id} onClick={() => navigate(`/tickets?ownerId=${w.id}`)} title={t('dashboard.openTickets')}>
                    <td>{w.name}</td><td style={{ textAlign: 'right' }}>{w.open_tickets}</td><td style={{ textAlign: 'right' }}>{w.high_priority}</td><td style={{ textAlign: 'right', color: w.breached ? 'var(--error)' : 'inherit', fontWeight: w.breached ? 700 : 400 }}>{w.breached}</td></tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3 className="card-title">{t('dashboard.escalation')}</h3>
            <table className="table">
              <thead><tr><th>{t('ticket.code')}</th><th>{t('common.priority')}</th><th>{t('common.status')}</th><th style={{ textAlign: 'right' }}>{t('dashboard.hoursLeft')}</th></tr></thead>
              <tbody>
                {data?.escalation?.length ? data.escalation.map((e: any) => (
                  <tr key={e.id} onClick={() => navigate(`/tickets/${e.id}`)}>
                    <td><b>{e.code}</b><div className="subline">{e.project_name}</div></td>
                    <td><PriorityBadge level={e.priority_level} /></td>
                    <td><StatusBadge status={e.status} /></td>
                    <td style={{ textAlign: 'right', color: e.hours_left < 0 ? 'var(--error)' : e.hours_left < 4 ? 'var(--warning)' : 'inherit', fontWeight: 600 }}>{e.hours_left == null ? '—' : `${Math.round(e.hours_left)}h`}</td>
                  </tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noEscalation')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick tables — urgent ones get a pulsing red marker (Excel rows 13/14) */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginTop: 16 }}>
          {[
            { key: 'slaAtRisk', rows: data?.quick?.slaAtRisk, urgent: true },
            { key: 'unowned', rows: data?.quick?.unowned, urgent: true },
            { key: 'waitingStale', rows: data?.quick?.waitingStale, urgent: false },
          ].map((q) => (
            <div key={q.key} className={`card ${q.urgent && q.rows?.length ? 'urgent-blink' : ''}`}>
              <h3 className="card-title" style={q.urgent && q.rows?.length ? { color: 'var(--error)' } : undefined}>
                {q.urgent && q.rows?.length ? <span className="pulse-dot" /> : null}{t(`dashboard.${q.key}`)}
                {q.rows?.length ? <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: q.urgent ? 'var(--error)' : 'var(--text-muted)' }}>({q.rows.length})</span> : null}
              </h3>
              {q.rows?.length ? q.rows.map((r: any) => (
                <div key={r.id} onClick={() => navigate(`/tickets/${r.id}`)} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 6, alignItems: 'baseline', borderLeft: q.urgent ? '3px solid var(--error)' : 'none', paddingLeft: q.urgent ? 8 : 0 }}>
                  <b style={{ color: q.urgent ? 'var(--error)' : 'var(--color-primary)' }}>{r.code}</b>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                </div>
              )) : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('common.noData')}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
