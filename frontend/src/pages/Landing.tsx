import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';

const NAV_LINKS = ['Overview', 'Features', 'Solutions', 'Pricing', 'Customers', 'Contact'];
const LOGOS = ['Microsoft', 'Shopify', 'Notion', 'Slack', 'Vercel', 'GitHub'];

const METRICS = [
  { v: '99.98%', l: 'System Uptime' },
  { v: '3M+', l: 'Tickets Resolved' },
  { v: '120+', l: 'Countries' },
  { v: '24/7', l: 'AI Automation' },
];

const FEATURES = [
  {
    icon: 'inbox',
    title: 'Omnichannel Inbox',
    lead: 'Unified conversations across every channel.',
    chips: ['Email', 'Chat', 'Facebook', 'Zalo', 'WhatsApp', 'Telegram'],
  },
  {
    icon: 'ai',
    title: 'AI Agent',
    lead: 'Resolve routine questions before they reach a human.',
    chips: ['Automatic replies', 'Summaries', 'Suggested responses', 'Knowledge retrieval'],
  },
  {
    icon: 'ticket',
    title: 'Smart Ticketing',
    lead: 'Structure, prioritize and route every request.',
    chips: ['Priorities', 'SLA', 'Automation', 'Assignment Rules', 'Tags'],
  },
  {
    icon: 'chart',
    title: 'Analytics',
    lead: 'Measure what matters, in real time.',
    chips: ['Response Time', 'Resolution Time', 'Customer Satisfaction', 'Team Productivity'],
  },
];

function FeatureIcon({ name }: { name: string }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'inbox':
      return (<svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>);
    case 'ai':
      return (<svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></svg>);
    case 'ticket':
      return (<svg {...p}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6z" /><path d="M13 7v10" strokeDasharray="2 2" /></svg>);
    case 'chart':
      return (<svg {...p}><path d="M3 3v18h18" /><path d="M7 15l3-4 3 2 4-6" /></svg>);
    default:
      return null;
  }
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="liquid-glass">
      {children}
    </a>
  );
}

export function Landing() {
  const navigate = useNavigate();

  // The app shell is overflow:hidden; opt this long page into scrolling.
  useEffect(() => {
    document.documentElement.classList.add('hd-scrollable');
    return () => document.documentElement.classList.remove('hd-scrollable');
  }, []);

  const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <div className="hd">
      <video className="hd-video" autoPlay muted loop playsInline poster="">
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      <div className="hd-layer">
        {/* ── NAV ── */}
        <nav className="hd-nav">
          <div className="hd-brand">
            <span className="hd-logo">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="hd-brand-name">HiDesk</span>
          </div>
          <div className="hd-navlinks">
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`}>{l}</a>
            ))}
          </div>
          <button className="hd-btn hd-btn-pill liquid-glass" onClick={() => navigate('/login')}>
            Request Demo
          </button>
        </nav>

        {/* ── HERO ── */}
        <header className="hd-hero">
          <h1 className="hd-headline animate-fade-rise">
            Support customers.<br />
            <em className="not-italic">Resolve faster.</em><br />
            Delight every conversation.
          </h1>
          <p className="hd-sub animate-fade-rise-delay">
            HiDesk centralizes tickets, live chat, email, social channels, and AI automation into
            one intelligent workspace—helping teams deliver exceptional customer support with speed
            and clarity.
          </p>
          <div className="hd-hero-cta animate-fade-rise-delay-2">
            <button className="hd-btn hd-btn-primary" onClick={() => navigate('/login')}>Start Free Trial</button>
            <button className="hd-btn hd-btn-glass liquid-glass" onClick={() => navigate('/login')}>Book a Demo</button>
          </div>

          {/* ── TRUST BADGES ── */}
          <div className="hd-trust animate-fade-rise-delay-3">
            <span className="hd-trust-label">Trusted by modern support teams</span>
            {LOGOS.map((name) => (
              <span key={name} className="hd-logo-word">{name}</span>
            ))}
          </div>
        </header>

        {/* ── KEY METRICS ── */}
        <section className="hd-wrap" id="overview" style={{ paddingBottom: '2rem' }}>
          <div className="hd-metrics">
            {METRICS.map((m) => (
              <div key={m.l} className="hd-metric liquid-glass hd-stagger">
                <div className="hd-metric-val">{m.v}</div>
                <div className="hd-metric-label">{m.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURE GRID ── */}
        <section className="hd-wrap hd-section" id="features">
          <p className="hd-eyebrow">The platform</p>
          <h2 className="hd-h2">Everything support needs,<br />in one intelligent workspace.</h2>
          <div className="hd-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="hd-feature liquid-glass hd-stagger">
                <div className="hd-feature-icon"><FeatureIcon name={f.icon} /></div>
                <h3 className="hd-feature-title">{f.title}</h3>
                <p className="hd-feature-lead">{f.lead}</p>
                <div className="hd-chips">
                  {f.chips.map((c) => <span key={c} className="hd-chip">{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="hd-wrap" id="pricing">
          <div className="hd-cta liquid-glass">
            <h2 className="hd-h2">Ready to transform<br />customer support?</h2>
            <p>Join thousands of growing businesses using HiDesk to deliver faster, smarter customer service.</p>
            <button className="hd-btn hd-btn-primary" onClick={() => navigate('/login')}>Start Free</button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="hd-wrap hd-footer" id="contact">
          <div className="hd-footer-top">
            <div className="hd-brand">
              <span className="hd-logo">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="hd-brand-name">HiDesk</span>
            </div>
            <nav className="hd-footer-nav">
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#support">Support</a>
            </nav>
            <div className="hd-social">
              <Social href="#twitter" label="X">
                <svg {...svgProps}><path d="M18 4l-5.5 6.8L18.5 20H15l-4-5-4 5H4l6-7.4L4.5 4H8l3.5 4.5L15 4z" /></svg>
              </Social>
              <Social href="#github" label="GitHub">
                <svg {...svgProps}><path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5a3 3 0 0 0-.9-2.3c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12 12 0 0 0-6 0C6.9 1.9 5.8 2.2 5.8 2.2a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 4.3 9.2c0 5 3 6.2 6 6.5a3 3 0 0 0-.8 2.3V21" /></svg>
              </Social>
              <Social href="#linkedin" label="LinkedIn">
                <svg {...svgProps}><path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-10h4v1.5A4 4 0 0 1 16 8z" /><rect x="2" y="9" width="4" height="11" /><circle cx="4" cy="4" r="2" /></svg>
              </Social>
            </div>
          </div>
          <div className="hd-copyright">© 2026 HiDesk. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}
