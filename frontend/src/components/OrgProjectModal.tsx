import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Org } from '../lib/types';

const CUSTOMER_PRIORITIES = ['platinum', 'gold', 'silver', 'bronze'];
const PROJECT_PRIORITIES = ['critical', 'high', 'medium', 'low'];

export function OrgProjectModal({ mode, orgs, onClose, onSaved }: {
  mode: 'org' | 'project'; orgs: Org[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [priority, setPriority] = useState(mode === 'org' ? 'silver' : 'medium');
  const [orgId, setOrgId] = useState(orgs[0]?.id || '');
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraKey, setJiraKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError(''); setSaving(true);
    try {
      if (mode === 'org') {
        await api.post('/orgs', { name, code, customerPriority: priority });
        toast(t('orgMgmt.createdOrg'), 'success');
      } else {
        await api.post('/projects', { orgId, name, code, projectPriority: priority, jiraUrl: jiraUrl || undefined, jiraKey: jiraKey || undefined });
        toast(t('orgMgmt.createdProject'), 'success');
      }
      onSaved(); onClose();
    } catch (e) { setError(apiError(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={mode === 'org' ? t('orgMgmt.createOrg') : t('orgMgmt.createProject')} onClose={onClose} width={480}>
      {mode === 'project' && (
        <div className="field">
          <label>{t('common.org')} <span className="req">*</span></label>
          <select className="select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label>{mode === 'org' ? t('orgMgmt.orgName') : t('orgMgmt.projectName')} <span className="req">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('orgMgmt.code')} <span className="req">*</span></label>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: ACME / HRM" />
      </div>
      <div className="field">
        <label>{mode === 'org' ? t('orgMgmt.customerPriority') : t('orgMgmt.projectPriority')}</label>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {(mode === 'org' ? CUSTOMER_PRIORITIES : PROJECT_PRIORITIES).map((p) => (
            <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>
          ))}
        </select>
      </div>
      {mode === 'project' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 2 }}><label>Jira URL</label><input className="input" value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="field" style={{ flex: 1 }}><label>Jira Key</label><input className="input" value={jiraKey} onChange={(e) => setJiraKey(e.target.value)} placeholder="HRM" /></div>
        </div>
      )}
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={saving || !name || !code} onClick={save}>{saving ? <span className="spinner" /> : t('common.save')}</button>
      </div>
    </Modal>
  );
}
