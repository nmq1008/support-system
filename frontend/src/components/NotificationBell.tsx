import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Notification } from '../lib/types';
import { Icon } from './Icon';
import { relativeTime } from '../lib/format';
import { useToast } from '../context/ToastContext';

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await api.get('/notifications');
    setItems(r.data.items);
    setUnread(r.data.unreadCount);
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    const handler = (n: Notification) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
      toast(n.message, 'info');
    };
    socket.on('notification', handler);
    return () => { socket.off('notification', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all');
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label={t('notif.title')}>
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="badge-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown-panel" style={{ top: 44, right: 0, width: 320, padding: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <b style={{ fontSize: 13 }}>{t('notif.title')}</b>
            <button className="btn-ghost btn btn-sm" onClick={markAll} style={{ height: 26 }}>{t('notif.markAll')}</button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t('notif.empty')}</div>}
            {items.map((n) => (
              <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : 'var(--color-primary-10)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{n.title || n.type}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{relativeTime(n.created_at, i18n.language)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
