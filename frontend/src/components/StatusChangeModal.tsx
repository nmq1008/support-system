import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { StatusBadge } from './Badges';
import { TicketStatus } from '../lib/types';
import { REQUIRED_META, TRANSITIONS } from '../lib/statusFlow';

interface Props {
  current: TicketStatus;
  /** When set, skip the status picker and go straight to meta/note for this target. */
  forcedTarget?: TicketStatus;
  onClose: () => void;
  onSubmit: (status: TicketStatus, note: string, meta: Record<string, string>) => Promise<void>;
}

export function StatusChangeModal({ current, forcedTarget, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<TicketStatus | ''>(forcedTarget || '');
  const [note, setNote] = useState('');
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = TRANSITIONS[current] || [];
  const required = target ? REQUIRED_META[target] || [] : [];

  async function submit() {
    if (!target) return;
    setError('');
    setSaving(true);
    try {
      await onSubmit(target as TicketStatus, note, meta);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('ticket.changeStatus')} onClose={onClose}>
      {forcedTarget ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <StatusBadge status={current} /> <span>→</span> <StatusBadge status={forcedTarget} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {options.map((s) => (
            <button key={s} onClick={() => { setTarget(s); setMeta({}); }} style={{ border: target === s ? '2px solid var(--color-primary)' : '1px solid var(--border)', borderRadius: 8, padding: 4, background: 'transparent' }}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}

      {required.length > 0 && (
        <div style={{ background: 'var(--color-primary-10)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚠ {t('common.required')}</div>
          {required.map((f) => (
            <div className="field" key={f.key} style={{ marginBottom: 8 }}>
              <label>{t(`statusMeta.${f.key}`)} <span className="req">*</span></label>
              <input className="input" type={f.type} value={meta[f.key] || ''} onChange={(e) => setMeta((m) => ({ ...m, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}

      <div className="field">
        <label>{t('ticket.comments')}</label>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={!target || saving} onClick={submit}>{saving ? <span className="spinner" /> : t('common.confirm')}</button>
      </div>
    </Modal>
  );
}
