import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Project, Template, TemplateField } from '../lib/types';
import { Icon } from '../components/Icon';
import { useToast } from '../context/ToastContext';

const PRIORITY_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5'];

export function CreateTicket() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'vi' | 'en';
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projectId, setProjectId] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P3');
  const [values, setValues] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/projects').then((r) => { setProjects(r.data.items); if (r.data.items[0]) setProjectId(r.data.items[0].id); }); }, []);
  useEffect(() => { if (projectId) api.get('/templates', { params: { projectId } }).then((r) => setTemplates(r.data.items)); }, [projectId]);

  async function checkDup(v: string) {
    setTitle(v);
    if (v.length > 4 && projectId) {
      try { const r = await api.post('/tickets/check-duplicate', { projectId, title: v }); setDuplicates(r.data.duplicates); }
      catch { setDuplicates([]); }
    } else setDuplicates([]);
  }

  async function submit() {
    if (!title.trim() || !projectId) { toast(t('common.required'), 'error'); return; }
    setSaving(true);
    try {
      const fields = Object.entries(values).map(([key, value]) => ({ key, value }));
      const r = await api.post('/tickets', {
        title, projectId, priorityLevel: priority, templateId: template?.id || null,
        category: template?.category, fields,
      });
      toast(`${r.data.code} ${t('common.create')}`, 'success');
      navigate(`/tickets/${r.data.id}`);
    } catch (e) { toast(apiError(e), 'error'); }
    finally { setSaving(false); }
  }

  function renderField(f: TemplateField) {
    if (f.type === 'section') return <h4 key={f.key} style={{ margin: '12px 0 4px', color: 'var(--color-primary)' }}>{f.label[lang]}</h4>;
    const common = { value: values[f.key] || '', onChange: (e: any) => setValues((v) => ({ ...v, [f.key]: e.target.value })) };
    return (
      <div className="field" key={f.key}>
        <label>{f.label[lang]} {f.required && <span className="req">*</span>}</label>
        {f.type === 'textarea' && <textarea className="textarea" placeholder={f.placeholder} {...common} />}
        {(f.type === 'text') && <input className="input" placeholder={f.placeholder} {...common} />}
        {f.type === 'date' && <input className="input" type="date" {...common} />}
        {f.type === 'toggle' && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={values[f.key] === 'true'} onChange={(e) => setValues((v) => ({ ...v, [f.key]: String(e.target.checked) }))} /> {t('common.yes')}</label>}
        {f.type === 'priority' && (
          <select className="select" {...common}>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {f.type === 'select' && (
          <select className="select" {...common}>
            <option value="">—</option>
            {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
          </select>
        )}
        {f.type === 'file' && <input className="input" type="file" disabled title="Upload sau khi tạo ticket" />}
        {f.tooltip && <div className="helper">{f.tooltip}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('ticket.create')}</h1></div></div>
      <div className="content-scroll">
        <div style={{ maxWidth: 720 }}>
          {/* Step 1: project + template picker */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>{t('common.project')} <span className="req">*</span></label>
              <select className="select" value={projectId} onChange={(e) => { setProjectId(e.target.value); setTemplate(null); }}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.org_name})</option>)}
              </select>
            </div>
            <label style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>{t('ticket.chooseTemplate')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {templates.map((tp) => (
                <button key={tp.id} onClick={() => setTemplate(tp)} style={{ textAlign: 'left', padding: 12, borderRadius: 10, border: template?.id === tp.id ? '2px solid var(--color-primary)' : '1px solid var(--border)', background: template?.id === tp.id ? 'var(--color-primary-10)' : 'var(--bg-surface)' }}>
                  <Icon name="template" size={18} />
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{lang === 'en' ? tp.name_en || tp.name : tp.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: form */}
          <div className="card">
            <div className="field">
              <label>{t('ticket.title')} <span className="req">*</span></label>
              <input className="input" value={title} onChange={(e) => checkDup(e.target.value)} />
            </div>
            {duplicates.length > 0 && (
              <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
                <b>⚠ {t('ticket.duplicateWarning')}</b>
                {duplicates.map((d) => (
                  <div key={d.id} style={{ marginTop: 4, cursor: 'pointer' }} onClick={() => navigate(`/tickets/${d.id}`)}><b>{d.code}</b> — {d.title}</div>
                ))}
              </div>
            )}
            {!template && (
              <div className="field">
                <label>{t('common.priority')}</label>
                <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            {template?.fields_schema.map(renderField)}
            {/* keep priority in sync if a template priority field is used */}
            {template?.fields_schema.some((f) => f.type === 'priority') === false && null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>{t('common.cancel')}</button>
              <button className="btn btn-primary" disabled={saving} onClick={() => { if (template) { const pf = template.fields_schema.find((f) => f.type === 'priority'); if (pf && values[pf.key]) setPriority(values[pf.key]); } submit(); }}>
                {saving ? <span className="spinner" /> : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
