import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { TicketDetail, TicketStatus, User } from '../lib/types';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge, StatusBadge } from '../components/Badges';
import { Avatar, Skeleton } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { JiraGuideModal } from '../components/JiraGuideModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, relativeTime } from '../lib/format';

const STAFF_ROLES = ['super_admin', 'csm', 'dev_lead', 'dev', 'gate'];

export function TicketDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [statusModal, setStatusModal] = useState(false);
  const [jiraModal, setJiraModal] = useState(false);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [owners, setOwners] = useState<User[]>([]);
  const isStaff = user && STAFF_ROLES.includes(user.role);

  async function load() {
    try {
      const r = await api.get(`/tickets/${id}`);
      setTicket(r.data);
    } catch (e) {
      toast(apiError(e), 'error');
      navigate('/tickets');
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { if (isStaff) api.get('/users', { params: { staff: true } }).then((r) => setOwners(r.data.items)).catch(() => {}); }, [isStaff]);

  async function changeStatus(status: TicketStatus, note: string, meta: Record<string, string>) {
    try {
      await api.post(`/tickets/${id}/status`, { status, note, meta });
      toast(t('common.update'), 'success');
      load();
    } catch (e) { throw new Error(apiError(e)); }
  }

  async function assignOwner(ownerId: string) {
    await api.patch(`/tickets/${id}`, { ownerId: ownerId || null });
    toast(t('common.update'), 'success');
    load();
  }

  async function postComment() {
    if (!comment.trim()) return;
    // naive @mention: match @word against owners list
    const mentions = owners.filter((o) => comment.includes('@' + o.name.split(' ').pop())).map((o) => o.id);
    await api.post(`/tickets/${id}/comments`, { content: comment, isInternal: internal, mentions });
    setComment('');
    load();
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/tickets/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Uploaded', 'success');
      load();
    } catch (e) { toast(apiError(e), 'error'); }
  }

  if (!ticket) return <div className="content-scroll" style={{ paddingTop: 20 }}><Skeleton height={40} /><div style={{ height: 12 }} /><Skeleton height={200} /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="icon-btn" onClick={() => navigate('/tickets')}><Icon name="chevron" size={18} /></button>
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: 'var(--color-primary)' }}>{ticket.code}</span> · {ticket.title}
              </h1>
            </div>
          </div>
          <div className="page-actions">
            {isStaff && <button className="btn btn-secondary btn-sm" onClick={() => setJiraModal(true)}><Icon name="jira" size={16} /> {t('ticket.jira')}</button>}
            <button className="btn btn-primary btn-sm" onClick={() => setStatusModal(true)}>{t('ticket.changeStatus')}</button>
          </div>
        </div>
      </div>

      <div className="content-scroll">
        <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          {/* Main column */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <StatusBadge status={ticket.status} />
                <PriorityBadge level={ticket.priority_level} />
                {(ticket as any).project_priority && <ProjectPriorityBadge value={(ticket as any).project_priority} />}
                {(ticket as any).customer_priority && <CustomerPriorityBadge value={(ticket as any).customer_priority} />}
                {ticket.escalated && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>{t('ticket.escalated')}</span>}
                {ticket.sla.breached && <span className="tag-chip" style={{ background: '#FEE2E2', color: '#DC2626' }}>{t('ticket.slaBreached')}</span>}
                {ticket.tags.map((tg) => <span key={tg.id} className="tag-chip" style={{ background: `${tg.color}22`, color: tg.color }}>#{tg.name}</span>)}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }} dangerouslySetInnerHTML={{ __html: ticket.description || '<i style="color:var(--text-muted)">—</i>' }} />
              {/* Template field values */}
              {ticket.fields.length > 0 && (
                <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                  {ticket.fields.map((f) => (
                    <div key={f.field_key} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                      <b style={{ minWidth: 130, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{f.field_key}</b>
                      <span>{f.field_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="card">
              <h3 className="card-title">{t('ticket.attachments')}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {ticket.attachments.map((a) => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="tag-chip" style={{ background: 'var(--bg-sunken)' }}>
                    <Icon name="paperclip" size={14} /> {a.file_name}
                  </a>
                ))}
                {ticket.attachments.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('common.noData')}</span>}
              </div>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Icon name="paperclip" size={14} /> Upload
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              </label>
            </div>

            {/* Comments */}
            <div className="card">
              <h3 className="card-title">{t('ticket.comments')}</h3>
              <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                {ticket.comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar name={c.user_name} size={32} />
                    <div style={{ flex: 1, background: c.is_internal ? '#FEF3C7' : 'var(--bg-sunken)', borderRadius: 10, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <b>{c.user_name} {c.is_internal && <span className="tag-chip" style={{ background: '#F59E0B33', color: '#B45309' }}>{t('ticket.internal')}</span>}</b>
                        <span style={{ color: 'var(--text-muted)' }}>{relativeTime(c.created_at, i18n.language)}</span>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: c.content }} />
                    </div>
                  </div>
                ))}
                {ticket.comments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('common.noData')}</div>}
              </div>
              <textarea className="textarea" placeholder={t('ticket.addComment')} value={comment} onChange={(e) => setComment(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                {isStaff ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {t('ticket.internalNote')}
                  </label>
                ) : <span />}
                <button className="btn btn-primary btn-sm" onClick={postComment}>{t('common.submit')}</button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card">
              <h3 className="card-title">{t('ticket.slaResolve')}</h3>
              <SlaMeter fraction={ticket.sla.remainingFraction} breached={ticket.sla.breached} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{formatDate(ticket.sla.resolveDeadline, i18n.language)}</div>
              {ticket.sla.pausedAt && <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}><Icon name="clock" size={12} /> paused</div>}
            </div>

            <div className="card" style={{ display: 'grid', gap: 10 }}>
              <Meta label={t('common.project')} value={`${ticket.project_name}`} />
              <Meta label={t('common.org')} value={ticket.org_name || '—'} />
              <Meta label={t('common.customer')} value={ticket.customer_name || '—'} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('common.owner')}</div>
                {isStaff ? (
                  <select className="select" value={ticket.owner_id || ''} onChange={(e) => assignOwner(e.target.value)}>
                    <option value="">{t('common.unassigned')}</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : <div>{ticket.owner_name || '—'}</div>}
              </div>
              {(ticket.reopen_count ?? 0) > 0 && <Meta label={t('ticket.reopenCount')} value={String(ticket.reopen_count)} />}
              {ticket.jira_issue_id && <Meta label="Jira" value={ticket.jira_issue_id} />}
            </div>

            {/* History / audit log */}
            <div className="card">
              <h3 className="card-title">{t('ticket.history')}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {ticket.history.map((h) => (
                  <div key={h.id} style={{ fontSize: 12, borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
                    <div style={{ color: 'var(--text-secondary)' }}>{relativeTime(h.changed_at, i18n.language)} · {h.changed_by_name}</div>
                    <div>
                      {h.action === 'status' && <>{t('common.status')}: <b>{h.old_status ? t(`status.${h.old_status}`) : '—'}</b> → <b>{t(`status.${h.new_status}`)}</b></>}
                      {h.action === 'create' && <b>{t('common.create')}</b>}
                      {h.action === 'update' && <>{h.field}: {h.new_value}</>}
                      {h.action === 'jira_link' && <>Jira link: {h.new_value}</>}
                    </div>
                    {h.note && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{h.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {statusModal && <StatusChangeModal current={ticket.status} onClose={() => setStatusModal(false)} onSubmit={changeStatus} />}
      {jiraModal && <JiraGuideModal ticketId={ticket.id} onClose={() => setJiraModal(false)} onLinked={load} />}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <b style={{ textAlign: 'right' }}>{value}</b>
    </div>
  );
}

function SlaMeter({ fraction, breached }: { fraction: number | null; breached: boolean }) {
  const pct = fraction == null ? 0 : Math.max(0, Math.min(100, fraction * 100));
  const color = breached ? '#EF4444' : pct < 20 ? '#F59E0B' : '#19B36E';
  return (
    <div style={{ height: 10, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ width: `${breached ? 100 : pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
    </div>
  );
}
