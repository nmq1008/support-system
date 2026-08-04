import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Project, Template, TemplateField } from '../lib/types';
import { Icon } from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { CustomerPriorityBadge, PriorityBadge, ProjectPriorityBadge } from '../components/Badges';
import { estimateResolveHours, humanHours, templateMeta } from '../lib/format';

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

  const project = projects.find((p) => p.id === projectId);

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
    // sync priority from a template priority field if present
    let level = priority;
    if (template) { const pf = template.fields_schema.find((f) => f.type === 'priority'); if (pf && values[pf.key]) level = values[pf.key]; }
    setSaving(true);
    try {
      const fields = Object.entries(values).map(([key, value]) => ({ key, value }));
      const r = await api.post('/tickets', { title, projectId, priorityLevel: level, templateId: template?.id || null, category: template?.category, fields });
      toast(`${r.data.code} ${t('common.create')}`, 'success');
      navigate(`/tickets/${r.data.id}`);
    } catch (e) { toast(apiError(e), 'error'); }
    finally { setSaving(false); }
  }

  const estHours = estimateResolveHours(priority, project?.customer_priority, project?.project_priority);

  function renderField(f: TemplateField) {
    if (f.type === 'section') return <h4 key={f.key} style={{ margin: '16px 0 4px', color: 'var(--color-primary)', fontSize: 13 }}>{f.label[lang]}</h4>;
    const common = { value: values[f.key] || '', onChange: (e: any) => setValues((v) => ({ ...v, [f.key]: e.target.value })) };
    return (
      <div className="field" key={f.key}>
        <label>{f.label[lang]} {f.required && <span className="req">*</span>}</label>
        {f.type === 'textarea' && <textarea className="textarea" placeholder={f.placeholder} {...common} />}
        {f.type === 'text' && <input className="input" placeholder={f.placeholder} {...common} />}
        {f.type === 'date' && <input className="input" type="date" {...common} />}
        {f.type === 'toggle' && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={values[f.key] === 'true'} onChange={(e) => setValues((v) => ({ ...v, [f.key]: String(e.target.checked) }))} /> {t('common.yes')}</label>}
        {f.type === 'priority' && <select className="select" {...common} onChange={(e) => { common.onChange(e); setPriority(e.target.value); }}>{PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
        {f.type === 'select' && <select className="select" {...common}><option value="">—</option>{(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}</select>}
        {f.type === 'file' && <input className="input" type="file" disabled title="Upload sau khi tạo ticket" />}
        {f.tooltip && <div className="helper">{f.tooltip}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="page-header"><div className="page-title-row">
        <h1 className="page-title">{t('ticket.create')}</h1>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tickets')}>{t('common.cancel')}</button>
          <button className="btn btn-primary btn-sm" disabled={saving || !title.trim()} onClick={submit}>{saving ? <span className="spinner" /> : <><Icon name="send" size={15} /> {t('common.submit')}</>}</button>
        </div>
      </div></div>

      <div className="content-scroll">
        <div className="create-grid">
          {/* ── Main column ── */}
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div className="card">
              <h3 className="card-title">{t('ticket.selectType')}</h3>
              <div className="field">
                <label>{t('common.project')} <span className="req">*</span></label>
                <select className="select" value={projectId} onChange={(e) => { setProjectId(e.target.value); setTemplate(null); }}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.org_name}</option>)}
                </select>
              </div>
              <div className="tpl-grid">
                {templates.map((tp) => {
                  const meta = templateMeta(tp.category);
                  const on = template?.id === tp.id;
                  return (
                    <button key={tp.id} onClick={() => setTemplate(tp)} className={`tpl-card ${on ? 'on' : ''}`}>
                      <span className="tpl-ic" style={{ background: `${meta.color}18`, color: meta.color }}><Icon name={meta.icon} size={20} /></span>
                      <span className="tpl-name">{lang === 'en' ? tp.name_en || tp.name : tp.name}</span>
                      <span className="tpl-desc">{lang === 'en' ? meta.descEn : meta.descVi}</span>
                      {on && <span className="tpl-check"><Icon name="check" size={13} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">{t('ticket.requestInfo')}</h3>
              <div className="field">
                <label>{t('ticket.title')} <span className="req">*</span></label>
                <input className="input" placeholder={lang === 'en' ? 'Short summary of the request' : 'Mô tả ngắn gọn yêu cầu'} value={title} onChange={(e) => checkDup(e.target.value)} />
              </div>
              {duplicates.length > 0 && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12 }}>
                  <b style={{ color: '#B45309' }}>⚠ {t('ticket.duplicateWarning')}</b>
                  {duplicates.map((d) => (
                    <div key={d.id} style={{ marginTop: 4, cursor: 'pointer' }} onClick={() => navigate(`/tickets/${d.id}`)}><b>{d.code}</b> — {d.title}</div>
                  ))}
                </div>
              )}
              {!template && (
                <div className="field">
                  <label>{t('common.priority')}</label>
                  <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                </div>
              )}
              {template?.fields_schema.map(renderField)}
            </div>
          </div>

          {/* ── Summary aside ── */}
          <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div className="card">
              <h3 className="card-title">{t('ticket.summary')}</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <SumRow label={t('common.project')} value={project?.name || '—'} />
                <SumRow label={t('common.org')} value={project?.org_name || '—'} />
                <div className="sum-row"><span>{t('common.customer')} · {t('common.priority')}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {project?.customer_priority && <CustomerPriorityBadge value={project.customer_priority} />}
                    {project?.project_priority && <ProjectPriorityBadge value={project.project_priority} />}
                  </span>
                </div>
                <div className="sum-row"><span>{t('ticket.selectedTemplate')}</span><b>{template ? (lang === 'en' ? template.name_en || template.name : template.name) : t('ticket.noTemplate')}</b></div>
                <div className="sum-row"><span>{t('common.priority')}</span><PriorityBadge level={priority as any} /></div>
              </div>
              <div className="sla-est">
                <span className="sla-est-label"><Icon name="clock" size={14} /> {t('ticket.estSla')}</span>
                <b className="sla-est-val">{humanHours(estHours, lang)}</b>
              </div>
            </div>

            <div className="card tip-card">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="info" size={16} /> {t('ticket.tipTitle')}</h3>
              <ul className="tip-list">
                <li>{t('ticket.tip1')}</li>
                <li>{t('ticket.tip2')}</li>
                <li>{t('ticket.tip3')}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return <div className="sum-row"><span>{label}</span><b style={{ textAlign: 'right' }}>{value}</b></div>;
}
