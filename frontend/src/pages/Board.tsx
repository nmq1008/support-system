import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Project, Ticket, TicketStatus } from '../lib/types';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge, StatusBadge } from '../components/Badges';
import { AvatarStack } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { STATUS_COLOR } from '../lib/format';
import { TRANSITIONS, REQUIRED_META } from '../lib/statusFlow';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { WorkflowModal } from '../components/WorkflowModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEFAULT_COLUMNS: TicketStatus[] = ['open', 'in_progress', 'build', 'testing', 'deploy', 'recheck', 'resolved', 'close'];
const CATEGORY_COLOR: Record<string, string> = { bug: '#DC2626', feature: '#7C3AED', help: '#0891B2', billable: '#D97706' };

export function Board() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  // Persist the selected project in the URL so Back from a ticket restores it (Excel row 21).
  const projectId = sp.get('projectId') || '';
  const setProjectId = (id: string) => { const n = new URLSearchParams(sp); if (id) n.set('projectId', id); else n.delete('projectId'); setSp(n); };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{ ticket: Ticket; target: TicketStatus } | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [justMoved, setJustMoved] = useState<string | null>(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'csm';
  const isCustomer = user?.role === 'customer' || user?.role === 'customer_admin';
  const isAll = projectId === 'all';
  const project = projects.find((p) => p.id === projectId);
  const columns = useMemo<TicketStatus[]>(
    () => (project?.board_columns?.length ? (project.board_columns as TicketStatus[]) : DEFAULT_COLUMNS),
    [project]
  );

  useEffect(() => {
    api.get('/projects').then((r) => {
      setProjects(r.data.items);
      // Default: admins see the all-customers overview (Excel row 17); others → first project.
      if (!projectId) setProjectId(isAdmin ? 'all' : r.data.items[0]?.id || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!projectId) return;
    const params = isAll ? { pageSize: 400 } : { projectId, pageSize: 200 };
    const r = await api.get('/tickets', { params });
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
    // optimistic + flash/settle animation on the moved card
    setTickets((prev) => prev.map((tk) => (tk.id === ticket.id ? { ...tk, status: target } : tk)));
    setJustMoved(ticket.id);
    setTimeout(() => setJustMoved((m) => (m === ticket.id ? null : m)), 760);
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
            <select className="select" style={{ width: 230, height: 34 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {isAdmin && <option value="all">{t('board.allProjects')}</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.org_name}</option>)}
            </select>
            {isAdmin && project && (
              <button className="btn btn-secondary btn-sm" onClick={() => setWorkflowOpen(true)}><Icon name="admin" size={16} /> {t('board.workflow')}</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/new')}><Icon name="plus" size={16} /> {t('nav.createTicket')}</button>
          </div>
        </div>
      </div>

      {isCustomer && (
        <div style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)', padding: '8px 14px', borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
          ⓘ {t('board.customerReview')}
        </div>
      )}

      <div className="content-scroll board-scroll" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div className="board-columns">
          {columns.map((col) => {
            const items = byStatus(col);
            const over = dragOver === col;
            return (
              <div key={col} className={`board-col ${over ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
                onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
                onDrop={() => onDrop(col)}>
                <div className="board-col-head" style={{ borderTopColor: STATUS_COLOR[col] }}>
                  <StatusBadge status={col} />
                  <span className="board-col-count">{items.length}</span>
                </div>
                <div className="board-col-body">
                  {items.map((tk) => {
                    const assignees = (tk.assignees && tk.assignees.length ? tk.assignees.map((a) => a.name) : tk.owner_name ? [tk.owner_name] : []);
                    return (
                      <div key={tk.id} className={`kb-card ${tk.sla.breached ? 'breached' : ''} ${justMoved === tk.id ? 'moved' : ''}`} draggable onDragStart={() => setDragId(tk.id)} onDragEnd={() => setDragId(null)}
                        onClick={() => navigate(`/tickets/${tk.id}`)}
                        style={{ opacity: dragId === tk.id ? 0.5 : 1, borderLeft: `4px solid ${CATEGORY_COLOR[(tk as any).category] || 'var(--border)'}` }}
                        title={(tk as any).category || ''}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                          <PriorityBadge level={tk.priority_level} />
                          <b style={{ fontSize: 12, color: 'var(--color-primary)' }}>{tk.code}</b>
                          {tk.escalated && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626', marginLeft: 'auto' }}>ESC</span>}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>{tk.title}</div>
                        {isAll && <div className="subline" style={{ marginBottom: 8 }}>{tk.project_name} · {tk.org_name}</div>}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {tk.project_priority && <ProjectPriorityBadge value={tk.project_priority} />}
                          {tk.customer_priority && <CustomerPriorityBadge value={tk.customer_priority} />}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {assignees.length ? <AvatarStack names={assignees} size={22} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('common.unassigned')}</span>}
                          {tk.sla.breached ? <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>SLA</span> : tk.sla.atRisk ? <span className="tag-chip" style={{ background: '#FEF3C7', color: '#B45309' }}>⚠ SLA</span> : null}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="kb-empty">{over ? '⤵' : ''}</div>}
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
