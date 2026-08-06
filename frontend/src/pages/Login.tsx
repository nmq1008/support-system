import { useState, useEffect, useRef } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Robust background video: keep it playing (nudge autoplay + resume on first
  // interaction), and add a subtle cursor parallax so the scene leans toward the
  // pointer. Works for any clip and never looks broken.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const kick = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    kick();
    const onFirst = () => { kick(); window.removeEventListener('pointerdown', onFirst); window.removeEventListener('keydown', onFirst); };
    window.addEventListener('pointerdown', onFirst);
    window.addEventListener('keydown', onFirst);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;   // -0.5 … 0.5
        const y = e.clientY / window.innerHeight - 0.5;
        v.style.transform =
          `scale(1.12) translate(${(-x * 30).toFixed(1)}px, ${(-y * 20).toFixed(1)}px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 4).toFixed(2)}deg)`;
      });
    };
    if (!reduce) window.addEventListener('mousemove', onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, []);

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
      {/* Fullscreen background video (SVG scene shows as poster / fallback) */}
      <video ref={videoRef} className="login-video" autoPlay muted loop playsInline preload="auto" poster="/login-bg.svg" aria-hidden>
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>
      <div className="login-video-tint" aria-hidden />

      {/* soft glow behind the card (keeps the video subject uncovered) */}
      <div className="login-bg" aria-hidden />

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
