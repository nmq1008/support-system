import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4';

const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55; // seconds before end to begin fading out

/* ── Inline icons (no icon lib dependency) ── */
const ic = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};
const Globe = (p: { size?: number }) => (
  <svg {...ic} width={p.size ?? 20} height={p.size ?? 20}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" /></svg>
);
const ArrowRight = (p: { size?: number }) => (
  <svg {...ic} width={p.size ?? 20} height={p.size ?? 20}><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></svg>
);
const Twitter = () => (
  <svg {...ic}><path d="M18 4l-5.5 6.8L18.5 20H15l-4-5-4 5H4l6-7.4L4.5 4H8l3.5 4.5L15 4z" /></svg>
);
const LinkedIn = () => (
  <svg {...ic}><path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-10h4v1.5A4 4 0 0 1 16 8z" /><rect x="2" y="9" width="4" height="11" /><circle cx="4" cy="4" r="2" /></svg>
);

export function Landing() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);

  // Lock the viewport (this is a single full-screen hero, not a scrolling page)
  useEffect(() => {
    document.documentElement.classList.add('asme-scrollable');
    return () => document.documentElement.classList.remove('asme-scrollable');
  }, []);

  // ── Custom rAF-based fade system (no CSS transitions) ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const fadeTo = (target: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); // cancel any competing frame
      const raw = parseFloat(v.style.opacity);
      const from = Number.isNaN(raw) ? 0 : raw;                 // resume from current opacity
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / FADE_MS);
        v.style.opacity = String(from + (target - from) * t);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const fadeIn = () => { fadingOutRef.current = false; fadeTo(1); };

    const onLoaded = () => { v.play().catch(() => {}); fadeIn(); };
    const onTimeUpdate = () => {
      if (!fadingOutRef.current && v.duration && v.duration - v.currentTime <= FADE_OUT_LEAD) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };
    const onEnded = () => {
      v.style.opacity = '0';
      window.setTimeout(() => {
        v.currentTime = 0;
        v.play().catch(() => {});
        fadeIn();
      }, 100);
    };

    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('ended', onEnded);
    // if already ready (cached)
    if (v.readyState >= 2) onLoaded();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  const go = () => navigate('/login');

  return (
    <div className="asme">
      <video ref={videoRef} className="asme-video" autoPlay muted playsInline preload="auto">
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* ── Nav ── */}
      <nav className="asme-nav">
        <div className="asme-nav-inner liquid-glass">
          <div className="asme-brand">
            <span className="asme-logo"><Globe size={24} /> HiDesk</span>
            <div className="asme-navlinks">
              <a onClick={go}>Features</a>
              <a onClick={go}>Pricing</a>
              <a onClick={go}>About</a>
            </div>
          </div>
          <div className="asme-nav-right">
            <button className="asme-textbtn" onClick={go}>Sign Up</button>
            <button className="asme-pill liquid-glass" onClick={go}>Login</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="asme-hero">
        <h1 className="asme-heading" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Built for better support
        </h1>

        <form className="asme-hero-form" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <div className="asme-email liquid-glass">
            <input type="email" placeholder="Enter your email" aria-label="Email" />
            <button type="submit" className="asme-submit" aria-label="Subscribe"><ArrowRight size={20} /></button>
          </div>
          <p className="asme-subtitle">
            Stay ahead on customer support with HiDesk. Subscribe for product updates, best
            practices, and early access—never miss what's next in support.
          </p>
        </form>

        <button className="asme-manifesto liquid-glass" onClick={go}>Read our manifesto</button>
      </main>

      {/* ── Social ── */}
      <footer className="asme-social">
        <a onClick={go} aria-label="LinkedIn" className="liquid-glass"><LinkedIn /></a>
        <a onClick={go} aria-label="Twitter" className="liquid-glass"><Twitter /></a>
        <a onClick={go} aria-label="Website" className="liquid-glass"><Globe /></a>
      </footer>
    </div>
  );
}
