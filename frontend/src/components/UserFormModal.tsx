import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Org, Project, Role } from '../lib/types';

const ROLES: Role[] = ['super_admin', 'csm', 'dev_lead', 'dev', 'gate', 'customer_admin', 'customer'];
const STAFF_ROLES: Role[] = ['csm', 'dev_lead', 'dev', 'gate'];

interface Props {
  userId?: string | null; // null/undefined = create mode
  orgs: Org[];
  projects: Project[];
  currentRole: Role; // acting admin's role
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormModal({ userId, orgs, projects, currentRole, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = !!userId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('dev');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [orgId, setOrgId] = useState('');
  const [active, setActive] = useState(true);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [managedOrgIds, setManagedOrgIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // A CSM admin cannot create a super_admin.
  const roleOptions = currentRole === 'csm' ? ROLES.filter((r) => r !== 'super_admin') : ROLES;

  useEffect(() => {
    if (!userId) return;
    api.get(`/users/${userId}`).then((r) => {
      const u = r.data;
      setName(u.name); setEmail(u.email); setRole(u.role); setLanguage(u.language);
      setOrgId(u.org_id || ''); setActive(u.active);
      setProjectIds(u.projectIds || []); setManagedOrgIds(u.managedOrgIds || []);
    }).catch((e) => setError(apiError(e)));
  }, [userId]);

  const isStaff = STAFF_ROLES.includes(role) || role === 'super_admin';
  const isCustomer = role === 'customer' || role === 'customer_admin';

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function save() {
    setError(''); setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/users/${userId}`, { name, role, language, active, ...(password ? { password } : {}) });
        await api.patch(`/users/${userId}/access`, { projectIds, managedOrgIds });
        toast(t('userMgmt.updated'), 'success');
      } else {
        await api.post('/users', {
          name, email, password, role, language,
          orgId: isCustomer ? orgId || null : null,
          projectIds, managedOrgIds,
        });
        toast(t('userMgmt.created'), 'success');
      }
      onSaved(); onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? t('userMgmt.edit') : t('userMgmt.create')} onClose={onClose} width={560}>
      <div className="field">
        <label>{t('userMgmt.name')} <span className="req">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {!isEdit && (
        <>
          <div className="field">
            <label>Email <span className="req">*</span></label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('userMgmt.password')} <span className="req">*</span></label>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="≥ 6 ký tự" />
          </div>
        </>
      )}
      {isEdit && (
        <div className="field">
          <label>{t('userMgmt.password')} <span className="helper">(để trống nếu không đổi)</span></label>
          <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>{t('userMgmt.role')} <span className="req">*</span></label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roleOptions.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 120 }}>
          <label>{t('userMgmt.language')}</label>
          <select className="select" value={language} onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}>
            <option value="vi">VI</option><option value="en">EN</option>
          </select>
        </div>
      </div>

      {/* Customer home org */}
      {isCustomer && (
        <div className="field">
          <label>{t('userMgmt.homeOrg')}</label>
          <select className="select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">—</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {/* CSM managed orgs */}
      {role === 'csm' && (
        <div className="field">
          <label>{t('userMgmt.managedOrgs')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {orgs.map((o) => (
              <button key={o.id} type="button" onClick={() => toggle(managedOrgIds, setManagedOrgIds, o.id)}
                className="tag-chip" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: managedOrgIds.includes(o.id) ? 'var(--color-primary)' : 'var(--bg-surface)', color: managedOrgIds.includes(o.id) ? '#fff' : 'var(--text-primary)' }}>
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Project access — for staff who coordinate/handle tickets */}
      {(isStaff || role === 'customer') && (
        <div className="field">
          <label>{t('userMgmt.projects')}</label>
          <div className="helper" style={{ marginBottom: 6 }}>{t('userMgmt.assignHint')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => toggle(projectIds, setProjectIds, p.id)}
                className="tag-chip" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: projectIds.includes(p.id) ? 'var(--color-primary)' : 'var(--bg-surface)', color: projectIds.includes(p.id) ? '#fff' : 'var(--text-primary)' }}>
                {p.name} <span style={{ opacity: 0.7 }}>· {p.org_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isEdit && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, margin: '4px 0 12px' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {t('userMgmt.active')}
        </label>
      )}

      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={saving || !name || (!isEdit && (!email || !password))} onClick={save}>
          {saving ? <span className="spinner" /> : t('common.save')}
        </button>
      </div>
    </Modal>
  );
}
