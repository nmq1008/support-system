import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { StarRating } from './StarRating';
import { Avatar } from './Avatar';
import { Review, TicketDetail, User } from '../lib/types';
import { relativeTime } from '../lib/format';

const DONE = ['resolved', 'complete', 'close'];
const REVIEWER_ROLES = ['super_admin', 'csm', 'dev_lead', 'gate'];

export function ReviewPanel({ ticket, role, staff, onReviewed }: {
  ticket: TicketDetail; role: string; staff: User[]; onReviewed: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const canReview = REVIEWER_ROLES.includes(role) && DONE.includes(ticket.status);

  // Default the dev being reviewed to the owner or first assignee.
  const devCandidates = [
    ...(ticket.owner_id ? [{ id: ticket.owner_id, name: ticket.owner_name || 'Owner' }] : []),
    ...ticket.assignees.filter((a) => a.id !== ticket.owner_id),
  ];
  const [devId, setDevId] = useState(devCandidates[0]?.id || '');
  const [rating, setRating] = useState(5);
  const [quality, setQuality] = useState(5);
  const [timeliness, setTimeliness] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!devId) return;
    setSaving(true);
    try {
      await api.post(`/tickets/${ticket.id}/reviews`, { devId, rating, quality, timeliness, comment: comment || undefined });
      toast(t('ticket.submitReview'), 'success');
      setComment('');
      onReviewed();
    } catch (e) { toast(apiError(e), 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card">
      <h3 className="card-title">⭐ {t('ticket.review')}</h3>

      {/* Existing reviews */}
      <div style={{ display: 'grid', gap: 10, marginBottom: canReview ? 16 : 0 }}>
        {ticket.reviews.map((r: Review) => (
          <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={r.dev_name} size={26} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.dev_name}</div>
                <div className="subline">{t('ticket.reviewedBy')} {r.reviewer_name} · {relativeTime(r.created_at, i18n.language)}</div>
              </div>
              <StarRating value={r.rating} readOnly size={16} />
            </div>
            {r.comment && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>{r.comment}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {r.quality != null && <span>{t('ticket.quality')}: {r.quality}/5</span>}
              {r.timeliness != null && <span>{t('ticket.timeliness')}: {r.timeliness}/5</span>}
            </div>
          </div>
        ))}
        {ticket.reviews.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('ticket.noReviews')}</div>}
      </div>

      {/* Review form (moderators, done tickets) */}
      {canReview && devCandidates.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="field">
            <label>{t('ticket.reviewDev')}</label>
            <select className="select" value={devId} onChange={(e) => setDevId(e.target.value)}>
              {devCandidates.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              {staff.filter((s) => !devCandidates.some((d) => d.id === s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <label style={{ fontSize: 12 }}>{t('ticket.rating')}<br /><StarRating value={rating} onChange={setRating} /></label>
            <label style={{ fontSize: 12 }}>{t('ticket.quality')}<br /><StarRating value={quality} onChange={setQuality} size={16} /></label>
            <label style={{ fontSize: 12 }}>{t('ticket.timeliness')}<br /><StarRating value={timeliness} onChange={setTimeliness} size={16} /></label>
          </div>
          <textarea className="textarea" placeholder={t('ticket.reviewNote')} value={comment} onChange={(e) => setComment(e.target.value)} style={{ minHeight: 60 }} />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={submit} disabled={saving || !devId}>{saving ? <span className="spinner" /> : t('ticket.submitReview')}</button>
        </div>
      )}
      {REVIEWER_ROLES.includes(role) && !DONE.includes(ticket.status) && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{t('ticket.reviewOnlyDone')}</div>
      )}
    </div>
  );
}
