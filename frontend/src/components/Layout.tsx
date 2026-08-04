import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { Role } from '../lib/types';

const NAV: { to: string; icon: string; key: string; roles?: Role[] }[] = [
  { to: '/dashboard', icon: 'dashboard', key: 'nav.dashboard', roles: ['super_admin', 'csm', 'dev_lead', 'dev', 'gate', 'customer_admin'] },
  { to: '/board', icon: 'template', key: 'nav.board' },
  { to: '/tickets', icon: 'ticket', key: 'nav.tickets' },
  { to: '/tickets/new', icon: 'plus', key: 'nav.createTicket' },
  { to: '/templates', icon: 'grip', key: 'nav.templates', roles: ['super_admin', 'csm'] },
  { to: '/reports', icon: 'report', key: 'nav.reports', roles: ['super_admin', 'csm', 'dev_lead', 'customer_admin'] },
  { to: '/admin', icon: 'admin', key: 'nav.admin', roles: ['super_admin', 'csm', 'customer_admin'] },
];

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout, setLanguage } = useAuth();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const nav = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  // ⌘K / Ctrl+K focuses the global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/tickets?search=${encodeURIComponent(search)}`);
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setCollapsed((c) => !c)} aria-label="menu"><Icon name="menu" size={20} /></button>
          <div className="brand">
            <span className="brand-logo"><Icon name="ticket" size={18} /></span>
            <span>HiDesk</span>
          </div>
        </div>
        <div className="header-mid">
          <form className="header-search" onSubmit={submitSearch}>
            <Icon name="search" size={18} />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} />
            <span className="kbd">⌘K</span>
          </form>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => setLanguage(i18n.language === 'vi' ? 'en' : 'vi')} title={t('common.language')} style={{ fontWeight: 700, fontSize: 12 }}>
            {i18n.language === 'vi' ? 'VI' : 'EN'}
          </button>
          <button className="icon-btn" onClick={toggle} title={t('common.darkMode')}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>
          <NotificationBell />
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" style={{ width: 'auto', padding: '0 6px', gap: 8, display: 'flex' }} onClick={() => setMenuOpen((o) => !o)}>
              <Avatar name={user?.name} size={30} />
              <span style={{ textAlign: 'left', lineHeight: 1.2 }} className="hide-sm">
                <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(`roles.${user?.role}`)}</div>
              </span>
              <Icon name="chevron" size={16} />
            </button>
            {menuOpen && (
              <div className="dropdown-panel" style={{ top: 44, right: 0, width: 200 }}>
                <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</div>
                <button className="sidebar-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }} style={{ height: 36, fontSize: 12 }}>
                  <span className="sidebar-icon"><Icon name="users" size={16} /></span> {t('profile.title')}
                </button>
                <button className="sidebar-item" onClick={logout} style={{ height: 36, fontSize: 12 }}>
                  <span className="sidebar-icon"><Icon name="logout" size={16} /></span> {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/tickets'} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} title={t(n.key)}>
              <span className="sidebar-icon"><Icon name={n.icon} size={18} /></span>
              <span className="sidebar-label">{t(n.key)}</span>
            </NavLink>
          ))}
        </aside>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
