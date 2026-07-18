import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';

export function JiraGuideModal({ ticketId, onClose, onLinked }: { ticketId: string; onClose: () => void; onLinked: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [guide, setGuide] = useState<any>(null);
  const [jiraId, setJiraId] = useState('');

  useEffect(() => {
    api.get(`/tickets/${ticketId}/jira-guide`).then((r) => setGuide(r.data)).catch((e) => toast(apiError(e), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    toast('Copied', 'success');
  }

  async function link() {
    if (!jiraId) return;
    await api.post(`/tickets/${ticketId}/jira-link`, { jiraIssueId: jiraId });
    toast('Linked ' + jiraId, 'success');
    onLinked();
    onClose();
  }

  return (
    <Modal title={t('ticket.jiraGuide')} onClose={onClose} width={640}>
      {!guide ? <div className="spinner" /> : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>Type: {guide.issueType}</span>
            <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>Priority: {guide.priority}</span>
            {guide.labels.map((l: string) => <span key={l} className="tag-chip" style={{ background: 'var(--bg-sunken)' }}>{l}</span>)}
          </div>

          <ol style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.9 }}>
            {guide.steps.map((s: any) => (
              <li key={s.step}>
                <b>{s.title}</b>{s.value ? <>: <span style={{ color: 'var(--text-secondary)' }}>{s.hint || ''}</span></> : ''}
                {s.value && s.title !== 'Description' && <div style={{ background: 'var(--bg-sunken)', padding: '4px 8px', borderRadius: 6, marginTop: 2, wordBreak: 'break-word' }}>{s.value}</div>}
              </li>
            ))}
          </ol>

          <div className="field">
            <label>Jira Description (copy)</label>
            <textarea className="textarea" style={{ fontFamily: 'monospace', minHeight: 160 }} readOnly value={guide.description} />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={() => copy(guide.description)}>Copy description</button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
            <div className="field">
              <label>{t('ticket.jiraLink')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="HRM-1234" value={jiraId} onChange={(e) => setJiraId(e.target.value)} />
                <button className="btn btn-primary" onClick={link} disabled={!jiraId}>{t('common.save')}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
