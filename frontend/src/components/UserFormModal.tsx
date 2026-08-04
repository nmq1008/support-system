import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Org, Project, Role } from '../lib/types';

const STAFF_ROLES: Role[] = ['super_admin', 'csm', 'dev_lead', 'dev', 'gate'];
const CUSTOMER_ROLES: Role[] = ['customer_admin', 'customer'];
type UType = 'staff' | 'customer';
const typeOf = (r: Role): UType => (CUSTOMER_ROLES.includes(r) ? 'customer' : 'staff');

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
  const isCustomerAdmin = currentRole === 'customer_admin';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(isCustomerAdmin ? 'customer' : 'dev');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [orgId, setOrgId] = useState('');
  const [active, setActive] = useState(true);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [managedOrgIds, setManagedOrgIds] = useState<string[]>([]);
  const [projSearch, setProjSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // org id → short code map (for compact chip labels)
  const orgCode = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o.code])), [orgs]);

  // Available roles per user type (a CSM cannot mint a Super Admin).
  const staffLevels = currentRole === 'csm' ? STAFF_ROLES.filter((r) => r !== 'super_admin') : STAFF_ROLES;
  const userType = typeOf(role);
  const roleOptions = userType === 'staff' ? staffLevels : CUSTOMER_ROLES;

  useEffect(() => {
    if (!userId) return;
    api.get(`/users/${userId}`).then((r) => {
      const u = r.data;
      setName(u.name); setEmail(u.email); setRole(u.role); setLanguage(u.language);
      setOrgId(u.org_id || ''); setActive(u.active);
      setProjectIds(u.projectIds || []); setManagedOrgIds(u.managedOrgIds || []);
    }).catch((e) => setError(apiError(e)));
  }, [userId]);

  const isStaff = userType === 'staff';
  const isCustomer = userType === 'customer';

  function setType(tp: UType) {
    if (userType === tp) return;
    setRole(tp === 'staff' ? staffLevels[0] : 'customer');
  }
  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  // Searchable project list (by name, project code, org name, org code).
  const filteredProjects = useMemo(() => {
    const q = projSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.code, p.org_name, orgCode[p.org_id]].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [projSearch, projects, orgCode]);

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
    <Modal title={isEdit ? t('userMgmt.edit') : t('userMgmt.create')} onClose={onClose} width={580}>
      {/* User type: Staff vs Customer */}
      {!isCustomerAdmin && (
        <div className="field">
          <label>{t('userMgmt.userType')} <span className="req">*</span></label>
          <div className="seg">
            <button type="button" className={`seg-btn ${isStaff ? 'on' : ''}`} onClick={() => setType('staff')}>
              <Icon name="users" size={15} /> {t('userMgmt.typeStaff')}
            </button>
            <button type="button" className={`seg-btn ${isCustomer ? 'on' : ''}`} onClick={() => setType('customer')}>
              <Icon name="building" size={15} /> {t('userMgmt.typeCustomer')}
            </button>
          </div>
        </div>
      )}

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
          <label>{isStaff ? t('userMgmt.level') : t('userMgmt.role')} <span className="req">*</span></label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isCustomerAdmin}>
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
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.code} — {o.name}</option>)}
          </select>
        </div>
      )}

      {/* CSM managed orgs */}
      {role === 'csm' && (
        <div className="field">
          <label>{t('userMgmt.managedOrgs')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {orgs.map((o) => {
              const on = managedOrgIds.includes(o.id);
              return (
                <button key={o.id} type="button" title={o.name} onClick={() => toggle(managedOrgIds, setManagedOrgIds, o.id)}
                  className="tag-chip" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: on ? 'var(--color-primary)' : 'var(--bg-surface)', color: on ? '#fff' : 'var(--text-primary)' }}>
                  <b>{o.code}</b> · {o.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project access — searchable, compact code labels */}
      {(isStaff || role === 'customer') && (
        <div className="field">
          <label>{t('userMgmt.projects')} {projectIds.length > 0 && <span className="helper">· {projectIds.length} {t('userMgmt.selected')}</span>}</label>
          <div className="helper" style={{ marginBottom: 6 }}>{t('userMgmt.assignHint')}</div>
          <div className="header-search" style={{ height: 34, marginBottom: 8, maxWidth: '100%' }}>
            <Icon name="search" size={15} />
            <input placeholder={t('userMgmt.searchProject')} value={projSearch} onChange={(e) => setProjSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 2 }}>
            {filteredProjects.map((p) => {
              const on = projectIds.includes(p.id);
              return (
                <button key={p.id} type="button" title={`${p.name} · ${p.org_name}`} onClick={() => toggle(projectIds, setProjectIds, p.id)}
                  className="tag-chip" style={{ cursor: 'pointer', border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border)'}`, background: on ? 'var(--color-primary)' : 'var(--bg-surface)', color: on ? '#fff' : 'var(--text-primary)' }}>
                  <b>{p.code}</b> · {orgCode[p.org_id] || p.org_name}
                </button>
              );
            })}
            {filteredProjects.length === 0 && <span className="helper">{t('common.noData')}</span>}
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
