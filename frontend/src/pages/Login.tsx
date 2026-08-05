import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { Icon } from '../components/Icon';

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

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem('hidesk_email', email); else localStorage.removeItem('hidesk_email');
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

  return (
    <div className="login-basic">
      {/* Cinematic helpdesk background (generated image + drifting aurora + floating activity) */}
      <div className="login-bg" aria-hidden>
        <div className="lb-aurora lb-a1" />
        <div className="lb-aurora lb-a2" />
        {/* floating helpdesk activity */}
        <div className="lb-chip lb-c1"><span className="lb-dot ok" /> HD-1042 <span className="lb-pill">Resolved</span></div>
        <div className="lb-chip lb-c2"><Icon name="bell" size={14} /> New ticket assigned</div>
        <div className="lb-ring lb-c3"><span className="in">96%<small>SLA</small></span></div>
        <div className="lb-chip lb-c5"><Icon name="check2" size={14} /> SLA on track</div>
        <div className="lb-bubble lb-c4"><span className="em">CS</span> How can we help you today?</div>
      </div>

      <button className="login-lang" onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'EN' : 'VI'}</button>

      <div className="login-card">
        <div className="login-brand login-brand-sm">
          <span className="login-brand-mark"><Icon name="ticket" size={22} /></span>
          <span>HiDesk</span>
        </div>

        {!forgot ? (
          <>
            <h2 className="login-h2">{t('auth.welcome')}</h2>
            <p className="login-sub">{t('auth.signInStart')}</p>
            <form onSubmit={submit}>
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
    </div>
  );
}
