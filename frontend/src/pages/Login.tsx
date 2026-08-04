import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { Icon } from '../components/Icon';

const DEMO: { email: string; roleKey: string; icon: string }[] = [
  { email: 'superadmin@hidesk.vn', roleKey: 'super_admin', icon: 'shield' },
  { email: 'csm@hidesk.vn', roleKey: 'csm', icon: 'users' },
  { email: 'devlead@hidesk.vn', roleKey: 'dev_lead', icon: 'check2' },
  { email: 'dev@hidesk.vn', roleKey: 'dev', icon: 'template' },
  { email: 'gate@hidesk.vn', roleKey: 'gate', icon: 'bell' },
  { email: 'custadmin@acme.com', roleKey: 'customer_admin', icon: 'building' },
  { email: 'customer@acme.com', roleKey: 'customer', icon: 'ticket' },
];

export function Login() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem('hidesk_email') || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState<boolean>(true);
  const [forgot, setForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [tryOpen, setTryOpen] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function doLogin(mail: string, pass: string) {
    setError(''); setLoading(true);
    try {
      await login(mail, pass);
      if (remember) localStorage.setItem('hidesk_email', mail); else localStorage.removeItem('hidesk_email');
    } catch (err) {
      setError(apiError(err, t('auth.invalid')));
    } finally { setLoading(false); }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault(); setForgotMsg(''); setLoading(true);
    try { const r = await api.post('/auth/forgot-password', { email }); setForgotMsg(r.data.message || t('auth.forgotSent')); }
    catch (err) { setForgotMsg(apiError(err)); }
    finally { setLoading(false); }
  }

  const features = [t('auth.feat1'), t('auth.feat2'), t('auth.feat3'), t('auth.feat4')];

  return (
    <div className="login-shell">
      {/* ── Brand / hero panel ── */}
      <aside className="login-hero">
        <div className="login-hero-bg" />
        <div className="login-hero-content">
          <div className="login-brand">
            <span className="login-brand-mark"><Icon name="ticket" size={26} /></span>
            <span>HiDesk</span>
          </div>
          <h1 className="login-hero-title">{t('auth.heroTagline')}</h1>
          <ul className="login-features">
            {features.map((f, i) => (
              <li key={i}><span className="login-feat-ic"><Icon name="check2" size={18} /></span>{f}</li>
            ))}
          </ul>
          <div className="login-stats">
            <div><b>30+</b><span>{t('auth.statOrg')}</span></div>
            <div><b>600+</b><span>{t('auth.statTicket')}</span></div>
            <div><b>7</b><span>{t('auth.statRole')}</span></div>
          </div>
          <div className="login-hero-foot"><Icon name="shield" size={14} /> {t('auth.secured')}</div>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="login-form-panel">
        <button className="login-lang" onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'EN' : 'VI'}</button>

        <div className="login-form">
          <div className="login-brand login-brand-sm">
            <span className="login-brand-mark"><Icon name="ticket" size={20} /></span>
            <span>HiDesk</span>
          </div>

          {!forgot ? (
            <>
              <h2 className="login-h2">{t('auth.welcome')}</h2>
              <p className="login-sub">{t('auth.signInStart')}</p>
              <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }}>
                <div className="field">
                  <label>{t('auth.email')}</label>
                  <input className="input" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t('auth.password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" style={{ paddingRight: 42 }} type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="login-eye" title={showPass ? t('auth.hidePass') : t('auth.showPass')} onClick={() => setShowPass((s) => !s)}><Icon name={showPass ? 'eye-off' : 'eye'} size={18} /></button>
                  </div>
                </div>
                <div className="login-row">
                  <label className="login-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t('auth.remember')}</label>
                  <button type="button" className="login-link" onClick={() => { setForgot(true); setForgotMsg(''); }}>{t('auth.forgot')}</button>
                </div>
                {error && <div className="login-error"><Icon name="x" size={14} /> {error}</div>}
                <button className="btn btn-primary" style={{ width: '100%', height: 44 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : t('auth.loginBtn')}
                </button>
              </form>

              {/* Try-it-out (staff experience) — tucked away for a professional look */}
              <div className="login-try">
                <button className="login-try-toggle" onClick={() => setTryOpen((o) => !o)}>
                  <Icon name="sparkles" size={15} /> {t('auth.tryTitle')}
                  <Icon name="chevron" size={15} />
                </button>
                {tryOpen && (
                  <div className="login-try-body">
                    <div className="login-try-hint">{t('auth.tryHint')}</div>
                    <div className="login-try-grid">
                      {DEMO.map((d) => (
                        <button key={d.email} className="login-try-chip" onClick={() => { setEmail(d.email); setPassword('Password@123'); doLogin(d.email, 'Password@123'); }}>
                          <Icon name={d.icon} size={16} />
                          <span>{t(`roles.${d.roleKey}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="login-h2">{t('auth.forgot')}</h2>
              <p className="login-sub">{t('auth.forgotHint')}</p>
              <form onSubmit={submitForgot}>
                <div className="field">
                  <label>{t('auth.email')}</label>
                  <input className="input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {forgotMsg && <div className="login-note"><Icon name="check2" size={14} /> {forgotMsg}</div>}
                <button className="btn btn-primary" style={{ width: '100%', height: 44 }} disabled={loading}>{loading ? <span className="spinner" /> : t('auth.forgotSubmit')}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setForgot(false)}>← {t('common.back')}</button>
              </form>
            </>
          )}

          <div className="login-copy">{t('auth.copyright')}</div>
        </div>
      </main>
    </div>
  );
}
