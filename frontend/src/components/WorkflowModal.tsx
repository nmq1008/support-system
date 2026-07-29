import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { StatusBadge } from './Badges';
import { Icon } from './Icon';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { TicketStatus } from '../lib/types';

const ALL_STATUSES: TicketStatus[] = [
  'open', 'in_progress', 'build', 'testing', 'deploy', 'recheck',
  'waiting', 'on_hold', 'complete', 'resolved', 'close', 'reopen',
];

export function WorkflowModal({ projectId, columns, onClose, onSaved }: {
  projectId: string; columns: TicketStatus[]; onClose: () => void; onSaved: (cols: TicketStatus[]) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [cols, setCols] = useState<TicketStatus[]>(columns);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const available = ALL_STATUSES.filter((s) => !cols.includes(s));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    const next = [...cols];
    [next[i], next[j]] = [next[j], next[i]];
    setCols(next);
  }
  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    const next = [...cols];
    const [m] = next.splice(dragIdx, 1);
    next.splice(i, 0, m);
    setCols(next);
    setDragIdx(null);
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/projects/${projectId}/workflow`, { boardColumns: cols });
      toast(t('board.savedWorkflow'), 'success');
      onSaved(cols);
      onClose();
    } catch (e) { toast(apiError(e), 'error'); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={t('board.workflow')} onClose={onClose} width={560}>
      <div className="helper" style={{ marginBottom: 12 }}>{t('board.workflowHint')}</div>

      <label style={{ fontSize: 12, fontWeight: 600 }}>{t('board.columns')}</label>
      <div style={{ display: 'grid', gap: 6, margin: '8px 0 16px' }}>
        {cols.map((s, i) => (
          <div key={s} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', background: 'var(--bg-sunken)' }}>
            <span style={{ cursor: 'grab', color: 'var(--text-muted)' }}><Icon name="grip" size={16} /></span>
            <span style={{ color: 'var(--text-muted)', width: 18 }}>{i + 1}</span>
            <StatusBadge status={s} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => move(i, 1)} disabled={i === cols.length - 1}>↓</button>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setCols(cols.filter((x) => x !== s))} disabled={cols.length <= 2}><Icon name="x" size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>{t('board.available')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {available.map((s) => (
              <button key={s} onClick={() => setCols([...cols, s])} style={{ border: '1px dashed var(--border-strong)', borderRadius: 8, padding: 4, background: 'transparent' }}>
                <StatusBadge status={s} /> +
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" /> : t('common.save')}</button>
      </div>
    </Modal>
  );
}
