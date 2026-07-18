import { ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 400, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 16, width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-surface)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
