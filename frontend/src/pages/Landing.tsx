import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import '../styles/landing.css';

const FEATURES = [
  { icon: 'zap', title: 'Smart Ticket Routing', desc: 'Tự động phân loại và định tuyến ticket tới đúng đội, đúng người xử lý.' },
  { icon: 'timer', title: 'SLA Engine + Countdown', desc: 'SLA 3 cấp theo khách hàng × dự án, đếm ngược & cảnh báo trước khi vi phạm.' },
  { icon: 'users', title: 'Customer Self-service', desc: 'Khách hàng tự tạo, theo dõi và đánh giá ticket của mình trong cổng riêng.' },
  { icon: 'barchart', title: 'Realtime Dashboard', desc: 'Bảng điều hành realtime: tải việc, escalation, tuân thủ SLA theo thời gian thực.' },
  { icon: 'link', title: 'Jira & Slack Integration', desc: 'Sinh Jira issue tự động và đồng bộ trạng thái, thông báo qua Slack.' },
  { icon: 'globe', title: 'Song ngữ VI & EN', desc: 'Toàn bộ giao diện, email và thông báo hỗ trợ Tiếng Việt và Tiếng Anh.' },
];

const LIFECYCLE: { s: string; c: string }[] = [
  { s: 'Open', c: '#3B82F6' }, { s: 'In Progress', c: '#F97316' }, { s: 'Build', c: '#8B5CF6' },
  { s: 'Testing', c: '#EAB308' }, { s: 'Deploy', c: '#10B981' }, { s: 'Recheck', c: '#06B6D4' },
  { s: 'Complete', c: '#86EFAC' }, { s: 'Close', c: '#374151' },
];
const BRANCH: { s: string; c: string }[] = [
  { s: 'Waiting', c: '#EF4444' }, { s: 'On Hold', c: '#92400E' }, { s: 'Reopen', c: '#DC2626' },
];

const TESTIMONIALS = [
  { q: 'HiDesk giúp đội mình cắt giảm 40% thời gian xử lý ticket. SLA rõ ràng, không còn bỏ sót.', n: 'Nguyễn Minh', c: 'Head of Support · Tiki' },
  { q: 'Cổng khách hàng và Kanban cực trực quan. Khách tự theo dõi được, đội mình nhẹ hẳn.', n: 'Trần Thu Hương', c: 'CSM · FPT Software' },
  { q: 'Dashboard realtime và chấm điểm dev là thứ mình tìm mãi mới có. Rất premium.', n: 'Lê Hoàng', c: 'Ops Lead · VNG' },
];

const PRICING = [
  { name: 'Starter', price: '0', unit: '/tháng', pop: false, feats: ['1 dự án', '5 người dùng', 'Ticket & SLA cơ bản', 'Email hỗ trợ'] },
  { name: 'Pro', price: '990k', unit: '/tháng', pop: true, feats: ['Không giới hạn dự án', '30 người dùng', 'Kanban + Workflow tuỳ chỉnh', 'Dashboard realtime', 'Jira & Slack'] },
  { name: 'Enterprise', price: 'Liên hệ', unit: '', pop: false, feats: ['Không giới hạn người dùng', 'SSO & phân quyền nâng cao', 'Đánh giá nhân sự', 'SLA riêng & hỗ trợ 24/7'] },
];

const AV = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export function Landing() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const goApp = () => navigate(user ? '/dashboard' : '/login');
  const [lit, setLit] = useState(0);

  // allow the (long) landing page to scroll — the app is overflow:hidden by default
  useEffect(() => {
    document.documentElement.classList.add('dl-scrollable');
    return () => document.documentElement.classList.remove('dl-scrollable');
  }, []);

  // status badges light up in sequence
  useEffect(() => {
    const total = LIFECYCLE.length + BRANCH.length;
    let i = 0;
    const id = setInterval(() => { i += 1; setLit(i); if (i >= total) clearInterval(id); }, 180);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dl">
      <div className="dl-grid" />
      <div className="dl-wrap">
        {/* ── Nav ── */}
        <nav className="dl-nav">
          <div className="dl-container dl-nav-inner">
            <span className="dl-logo">HiDesk<span className="dl-logo-dot" /></span>
            <div className="dl-nav-links">
              <a onClick={goApp}>Features</a><a onClick={goApp}>Pricing</a><a onClick={goApp}>Docs</a>
            </div>
            <div className="dl-nav-right">
              <button className="dl-lang" onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'VI' : 'EN'}</button>
              <button className="dl-link-btn" onClick={goApp}>{user ? 'Dashboard' : 'Log in'}</button>
              <button className="dl-btn dl-btn-blue" onClick={goApp}>Get Started</button>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <header className="dl-hero dl-container">
          <span className="dl-badge">Helpdesk reimagined <Icon name="arrow-right" size={14} /></span>
          <h1 className="dl-h1">Support your customers, <em>effortlessly.</em></h1>
          <p className="dl-lead">HiDesk kết nối đội ngũ và khách hàng trong một không gian làm việc thông minh. Theo dõi ticket, đảm bảo SLA và đóng vấn đề nhanh hơn.</p>
          <div className="dl-cta-row">
            <button className="dl-btn dl-btn-blue dl-btn-lg" onClick={goApp}>Start for free <Icon name="arrow-right" size={16} /></button>
            <button className="dl-btn dl-btn-ghost dl-btn-lg" onClick={goApp}><Icon name="play" size={15} /> Watch demo</button>
          </div>
          <div className="dl-trust">
            <div className="dl-avatars">{AV.map((c, i) => <span key={i} style={{ background: c }}>{String.fromCharCode(65 + i)}</span>)}</div>
            Trusted by 500+ support teams
          </div>
        </header>

        {/* ── Browser mockup ── */}
        <div className="dl-mock-wrap">
          <div className="dl-mock">
            <div className="dl-mock-bar">
              <span className="dl-dot" style={{ background: '#EF4444' }} /><span className="dl-dot" style={{ background: '#F59E0B' }} /><span className="dl-dot" style={{ background: '#10B981' }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--ts)' }}>app.hidesk.vn/tickets</span>
            </div>
            <div className="dl-mock-body">
              <div className="dl-mock-side">
                <div className="dl-mock-navi on"><Icon name="ticket" size={14} /> Tickets</div>
                <div className="dl-mock-navi"><Icon name="dashboard" size={14} /> Dashboard</div>
                <div className="dl-mock-navi"><Icon name="template" size={14} /> Kanban</div>
                <div className="dl-mock-navi"><Icon name="barchart" size={14} /> Reports</div>
              </div>
              <div>
                {[['HD-0481', 'Không đăng nhập được', 'Open', '#3B82F6'], ['HD-0479', 'Báo cáo xuất sai số liệu', 'In Progress', '#F97316'], ['HD-0472', 'Tích hợp VNPay', 'Testing', '#EAB308'], ['HD-0468', 'Sai kết quả tính lương', 'Deploy', '#10B981']].map((r, i) => (
                  <div key={i} className="dl-mock-row">
                    <span><b style={{ color: 'var(--blue)', fontSize: 12 }}>{r[0]}</b> <span className="c">{r[1]}</span></span>
                    <span className="dl-pill" style={{ background: r[3] as string, color: r[2] === 'Complete' ? '#083' : '#fff' }}>{r[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}><div className="dl-scroll-hint"><Icon name="chevron" size={22} /></div></div>

        {/* ── Features ── */}
        <section className="dl-section dl-container" id="features">
          <h2 className="dl-section-title">Everything your support team needs</h2>
          <p className="dl-section-sub">Từ tiếp nhận đến đóng ticket — một nền tảng duy nhất, đủ mạnh cho vận hành dịch vụ.</p>
          <div className="dl-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="dl-feat">
                <span className="dl-feat-ic"><Icon name={f.icon} size={20} /></span>
                <h3>{f.title}</h3><p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Status lifecycle ── */}
        <section className="dl-section dl-container">
          <h2 className="dl-section-title">From Open to Closed — every step tracked</h2>
          <p className="dl-section-sub">Vòng đời ticket rõ ràng với trạng thái màu sắc chuẩn, nhánh Waiting / On Hold / Reopen.</p>
          <div className="dl-flow dl-glass">
            <div className="dl-flow-row">
              {LIFECYCLE.map((x, i) => (
                <span key={x.s} style={{ display: 'contents' }}>
                  <span className={`dl-status ${lit > i ? 'lit' : ''}`} style={{ background: x.c, color: ['Complete', 'Resolved'].includes(x.s) ? '#064E3B' : '#fff' }}>{x.s}</span>
                  {i < LIFECYCLE.length - 1 && <span className="dl-flow-arrow"><Icon name="arrow-right" size={16} /></span>}
                </span>
              ))}
            </div>
            <div className="dl-branch">
              {BRANCH.map((x, i) => (
                <span key={x.s} className={`dl-status ${lit > LIFECYCLE.length + i ? 'lit' : ''}`} style={{ background: x.c }}>{x.s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="dl-section dl-container">
          <h2 className="dl-section-title">Loved by support teams</h2>
          <div className="dl-testi-grid" style={{ marginTop: 40 }}>
            {TESTIMONIALS.map((tm, i) => (
              <div key={i} className="dl-testi dl-glass">
                <div className="q"><Icon name="quote" size={22} /></div>
                <p>{tm.q}</p>
                <div className="dl-testi-who">
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: AV[i], display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 14 }}>{tm.n[0]}</span>
                  <div><b>{tm.n}</b><br /><span>{tm.c}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="dl-section dl-container" id="pricing">
          <h2 className="dl-section-title">Simple, transparent pricing</h2>
          <p className="dl-section-sub">Bắt đầu miễn phí. Nâng cấp khi đội bạn lớn hơn.</p>
          <div className="dl-price-grid">
            {PRICING.map((p) => (
              <div key={p.name} className={`dl-price dl-glass ${p.pop ? 'pop' : ''}`}>
                {p.pop && <span className="dl-price-tag">Most popular</span>}
                <h3>{p.name}</h3>
                <div className="amt">{p.price}<small>{p.unit}</small></div>
                <ul>{p.feats.map((f) => <li key={f}><Icon name="check" size={16} /> {f}</li>)}</ul>
                <button className={`dl-btn ${p.pop ? 'dl-btn-blue' : 'dl-btn-ghost'} dl-btn-lg`} onClick={goApp} style={{ width: '100%' }}>{p.name === 'Enterprise' ? 'Liên hệ' : 'Bắt đầu'}</button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="dl-footer dl-container">
          <div className="dl-footer-top">
            <div style={{ maxWidth: 280 }}>
              <span className="dl-logo">HiDesk<span className="dl-logo-dot" /></span>
              <p style={{ color: 'var(--ts)', fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>Nền tảng Ticket & Hỗ trợ cho đội Service Operations. Nhanh hơn, rõ ràng hơn mỗi ngày.</p>
            </div>
            <div className="dl-footer-links">
              <div className="dl-footer-col"><h4>Product</h4><a onClick={goApp}>Features</a><a onClick={goApp}>Pricing</a><a onClick={goApp}>Kanban</a></div>
              <div className="dl-footer-col"><h4>Company</h4><a onClick={goApp}>About</a><a onClick={goApp}>Docs</a><a onClick={goApp}>Contact</a></div>
              <div className="dl-footer-col"><h4>Legal</h4><a onClick={goApp}>Privacy</a><a onClick={goApp}>Terms</a></div>
            </div>
          </div>
          <div className="dl-footer-bottom">
            <span>© 2026 HiDesk — HiStaff. {t('auth.copyright') ? '' : ''}All rights reserved.</span>
            <span>Made with ❤️ for support teams</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
