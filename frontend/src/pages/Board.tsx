import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Project, Ticket, TicketStatus } from '../lib/types';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge, StatusBadge } from '../components/Badges';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { STATUS_COLOR } from '../lib/format';
import { TRANSITIONS, REQUIRED_META } from '../lib/statusFlow';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { WorkflowModal } from '../components/WorkflowModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEFAULT_COLUMNS: TicketStatus[] = ['open', 'in_progress', 'build', 'testing', 'deploy', 'recheck', 'resolved', 'close'];

export function Board() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{ ticket: Ticket; target: TicketStatus } | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'csm';
  const isCustomer = user?.role === 'customer' || user?.role === 'customer_admin';
  const project = projects.find((p) => p.id === projectId);
  const columns = useMemo<TicketStatus[]>(
    () => (project?.board_columns?.length ? (project.board_columns as TicketStatus[]) : DEFAULT_COLUMNS),
    [project]
  );

  useEffect(() => {
    api.get('/projects').then((r) => {
      setProjects(r.data.items);
      if (r.data.items[0]) setProjectId(r.data.items[0].id);
    });
  }, []);

  async function load() {
    if (!projectId) return;
    const r = await api.get('/tickets', { params: { projectId, pageSize: 200 } });
    setTickets(r.data.items);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  useEffect(() => {
    const socket = getSocket();
    const h = () => load();
    socket.on('ticket:changed', h);
    return () => { socket.off('ticket:changed', h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const byStatus = (s: TicketStatus) => tickets.filter((tk) => tk.status === s);

  async function applyMove(ticket: Ticket, target: TicketStatus, note = '', meta: Record<string, string> = {}) {
    // optimistic
    setTickets((prev) => prev.map((tk) => (tk.id === ticket.id ? { ...tk, status: target } : tk)));
    try {
      await api.post(`/tickets/${ticket.id}/status`, { status: target, note, meta });
      load();
    } catch (e) {
      toast(apiError(e), 'error');
      load(); // revert to server truth
    }
  }

  function onDrop(target: TicketStatus) {
    setDragOver(null);
    const ticket = tickets.find((tk) => tk.id === dragId);
    setDragId(null);
    if (!ticket || ticket.status === target) return;

    // Client-side guard: illegal transition
    if (!(TRANSITIONS[ticket.status] || []).includes(target)) {
      toast(t('board.moveNotAllowed'), 'error');
      return;
    }
    // Customer can only close/reopen
    if (isCustomer && !['close', 'reopen'].includes(target)) {
      toast(t('board.customerReview'), 'error');
      return;
    }
    // Needs mandatory metadata → open modal
    if (REQUIRED_META[target]) {
      setPendingMeta({ ticket, target });
      return;
    }
    applyMove(ticket, target);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title-row">
          <h1 className="page-title">{t('board.title')}</h1>
          <div className="page-actions">
            <select className="select btn-sm" style={{ width: 220, height: 34 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.org_name}</option>)}
            </select>
            {isAdmin && project && (
              <button className="btn btn-secondary btn-sm" onClick={() => setWorkflowOpen(true)}><Icon name="admin" size={16} /> {t('board.workflow')}</button>
            )}
          </div>
        </div>
      </div>

      {isCustomer && (
        <div style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)', padding: '8px 14px', borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
          ⓘ {t('board.customerReview')}
        </div>
      )}

      <div className="content-scroll" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, minHeight: 400, paddingBottom: 8 }}>
          {columns.map((col) => {
            const items = byStatus(col);
            return (
              <div key={col} onDragOver={(e) => { e.preventDefault(); setDragOver(col); }} onDrop={() => onDrop(col)}
                style={{ minWidth: 260, width: 260, flexShrink: 0, background: dragOver === col ? 'var(--color-primary-10)' : 'var(--bg-sunken)', borderRadius: 12, padding: 10, border: dragOver === col ? '2px dashed var(--color-primary)' : '2px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[col] }} />
                  <StatusBadge status={col} />
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{items.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map((tk) => (
                    <div key={tk.id} draggable onDragStart={() => setDragId(tk.id)}
                      onClick={() => navigate(`/tickets/${tk.id}`)}
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, cursor: 'grab', boxShadow: dragId === tk.id ? 'var(--shadow-card)' : 'none' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                        <PriorityBadge level={tk.priority_level} />
                        <b style={{ fontSize: 12, color: 'var(--color-primary)' }}>{tk.code}</b>
                        {tk.escalated && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>ESC</span>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{tk.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {tk.project_priority && <ProjectPriorityBadge value={tk.project_priority} />}
                        {tk.customer_priority && <CustomerPriorityBadge value={tk.customer_priority} />}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {tk.owner_name ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Avatar name={tk.owner_name} size={20} />{tk.owner_name}</span> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('common.unassigned')}</span>}
                        {tk.sla.breached ? <span style={{ fontSize: 11, color: 'var(--error)', fontWeight: 600 }}>SLA!</span> : tk.sla.atRisk ? <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>⚠</span> : null}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pendingMeta && (
        <StatusChangeModal
          current={pendingMeta.ticket.status}
          forcedTarget={pendingMeta.target}
          onClose={() => setPendingMeta(null)}
          onSubmit={async (status, note, meta) => { await applyMove(pendingMeta.ticket, status, note, meta); }}
        />
      )}
      {workflowOpen && project && (
        <WorkflowModal
          projectId={project.id}
          columns={columns}
          onClose={() => setWorkflowOpen(false)}
          onSaved={(cols) => setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, board_columns: cols } : p)))}
        />
      )}
    </>
  );
}
