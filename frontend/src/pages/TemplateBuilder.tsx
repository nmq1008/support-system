import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Template, TemplateField } from '../lib/types';
import { Icon } from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { templateMeta } from '../lib/format';

const FIELD_TYPES = ['text', 'textarea', 'select', 'multiselect', 'date', 'file', 'priority', 'toggle', 'section'];

function blankField(type: string): TemplateField {
  return { key: `field_${Math.random().toString(36).slice(2, 7)}`, type, label: { vi: '', en: '' }, required: false, placeholder: '', options: type === 'select' || type === 'multiselect' ? [{ value: 'opt1', label: { vi: 'Lựa chọn 1', en: 'Option 1' } }] : undefined };
}

export function TemplateBuilder() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'vi' | 'en';
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function load() { const r = await api.get('/templates'); setTemplates(r.data.items); }
  useEffect(() => { load(); }, []);

  function startNew() { setEditing({ id: '' } as Template); setName(''); setNameEn(''); setFields([]); }
  function edit(tp: Template) { setEditing(tp); setName(tp.name); setNameEn(tp.name_en || ''); setFields(tp.fields_schema || []); }

  function addField(type: string) { setFields((f) => [...f, blankField(type)]); }
  function updateField(i: number, patch: Partial<TemplateField>) { setFields((f) => f.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function removeField(i: number) { setFields((f) => f.filter((_, idx) => idx !== i)); }
  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    setFields((f) => { const next = [...f]; const [m] = next.splice(dragIdx, 1); next.splice(i, 0, m); return next; });
    setDragIdx(null);
  }

  async function save() {
    if (!name.trim()) { toast(t('common.required'), 'error'); return; }
    const payload = { name, nameEn, isGlobal: true, fieldsSchema: fields, category: 'custom' };
    try {
      if (editing?.id) await api.put(`/templates/${editing.id}`, payload);
      else await api.post('/templates', payload);
      toast(t('common.save'), 'success');
      setEditing(null);
      load();
    } catch (e) { toast(apiError(e), 'error'); }
  }

  if (!editing) {
    return (
      <>
        <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('nav.templates')}</h1>
          <button className="btn btn-primary btn-sm" onClick={startNew}><Icon name="plus" size={16} /> {t('common.create')}</button></div></div>
        <div className="content-scroll">
          <div className="tpl-gallery">
            {templates.map((tp) => {
              const meta = templateMeta(tp.category);
              return (
                <div key={tp.id} className="tpl-tile" style={{ ['--tpl-accent' as any]: meta.color }} onClick={() => edit(tp)}>
                  <span className="tpl-tile-ic" style={{ background: `${meta.color}18`, color: meta.color }}><Icon name={meta.icon} size={22} /></span>
                  <div className="tpl-tile-name">{lang === 'en' ? tp.name_en || tp.name : tp.name}</div>
                  <div className="tpl-tile-desc">{lang === 'en' ? meta.descEn : meta.descVi}</div>
                  <div className="tpl-tile-foot">
                    <span className="tpl-pill">{tp.fields_schema?.length || 0} {lang === 'en' ? 'fields' : 'trường'}</span>
                    {tp.is_default && <span className="tpl-pill" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>{lang === 'en' ? 'Default' : 'Mặc định'}</span>}
                  </div>
                </div>
              );
            })}
            <button className="tpl-add" onClick={startNew}>
              <Icon name="plus" size={22} />
              {t('ticket.newTemplate')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('template.builder')}</h1>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>{t('common.back')}</button>
          <button className="btn btn-primary btn-sm" onClick={save}>{t('common.save')}</button>
        </div></div></div>
      <div className="content-scroll">
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
          {/* Builder */}
          <div className="card">
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>{t('template.name')} (VI)</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>{t('template.nameEn')}</label><input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {FIELD_TYPES.map((ft) => (
                <button key={ft} className="btn btn-secondary btn-sm" onClick={() => addField(ft)}><Icon name="plus" size={12} /> {t(`template.types.${ft}`)}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {fields.map((f, i) => (
                <div key={f.key} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: 'var(--bg-sunken)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ cursor: 'grab', color: 'var(--text-muted)' }}><Icon name="grip" size={16} /></span>
                    <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)' }}>{t(`template.types.${f.type}`)}</span>
                    <label style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} /> {t('common.required')}
                    </label>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeField(i)}><Icon name="trash" size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" style={{ height: 34 }} placeholder="Label VI" value={f.label.vi} onChange={(e) => updateField(i, { label: { ...f.label, vi: e.target.value } })} />
                    <input className="input" style={{ height: 34 }} placeholder="Label EN" value={f.label.en} onChange={(e) => updateField(i, { label: { ...f.label, en: e.target.value } })} />
                  </div>
                </div>
              ))}
              {fields.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: 12 }}>{t('template.addField')}…</div>}
            </div>
          </div>

          {/* Realtime preview */}
          <div className="card">
            <h3 className="card-title">{t('template.preview')}</h3>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{lang === 'en' ? nameEn || name : name || '—'}</div>
            {fields.map((f) => (
              f.type === 'section' ? <h4 key={f.key} style={{ color: 'var(--color-primary)', margin: '12px 0 4px' }}>{f.label[lang] || f.label.vi}</h4> :
              <div className="field" key={f.key}>
                <label>{f.label[lang] || f.label.vi || '(label)'} {f.required && <span className="req">*</span>}</label>
                {f.type === 'textarea' ? <textarea className="textarea" disabled /> :
                  f.type === 'select' || f.type === 'multiselect' ? <select className="select" disabled><option>—</option></select> :
                  f.type === 'toggle' ? <input type="checkbox" disabled /> :
                  <input className="input" type={f.type === 'date' ? 'date' : f.type === 'file' ? 'file' : 'text'} disabled />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
