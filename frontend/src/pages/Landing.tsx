import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

/** Fade a block in after `delay` ms over `duration` ms. */
function FadeIn({ delay = 0, duration = 1000, className, style, children }: {
  delay?: number; duration?: number; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShow(true), delay); return () => clearTimeout(id); }, [delay]);
  return (
    <div className={className} style={{ opacity: show ? 1 : 0, transition: `opacity ${duration}ms ease`, ...style }}>
      {children}
    </div>
  );
}

/** Reveal the heading character-by-character with a staggered slide-in (words kept intact). */
function AnimatedHeading({ text }: { text: string }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const id = setTimeout(() => setGo(true), 200); return () => clearTimeout(id); }, []);
  const charDelay = 30;
  const charStyle = (delay: number): CSSProperties => ({
    display: 'inline-block',
    opacity: go ? 1 : 0,
    transform: go ? 'translateX(0)' : 'translateX(-18px)',
    transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
  });
  const lines = text.split('\n');
  return (
    <h1 className="lp-heading">
      {lines.map((line, li) => {
        const words = line.split(' ');
        let ci = 0; // running char index within the line
        return (
          <span key={li} style={{ display: 'block' }}>
            {words.map((word, wi) => {
              const wordNode = (
                <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {Array.from(word).map((ch) => {
                    const delay = li * line.length * charDelay + ci * charDelay;
                    ci++;
                    return <span key={ci} style={charStyle(delay)}>{ch}</span>;
                  })}
                </span>
              );
              ci++; // account for the breakable space between words
              return wi < words.length - 1 ? [wordNode, <span key={`s${wi}`}> </span>] : wordNode;
            })}
          </span>
        );
      })}
    </h1>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goApp = () => navigate(user ? '/dashboard' : '/login');

  return (
    <div className="lp-root">
      {/* Raw full-screen background video (no overlay) */}
      <video className="lp-video" src={VIDEO_URL} autoPlay loop muted playsInline />

      <div className="lp-shell">
        {/* Navbar */}
        <div className="lp-pad">
          <nav className="lp-nav liquid-glass">
            <span className="lp-logo"><Icon name="ticket" size={22} /> HiDesk</span>
            <div className="lp-nav-links">
              <a onClick={goApp}>Tính năng</a>
              <a onClick={goApp}>Bảng giá</a>
              <a onClick={goApp}>Tài liệu</a>
              <a onClick={goApp}>Liên hệ</a>
            </div>
            <button className="lp-nav-cta" onClick={goApp}>{user ? 'Vào hệ thống' : 'Đăng nhập'}</button>
          </nav>
        </div>

        {/* Hero */}
        <div className="lp-pad lp-hero">
          <div className="lp-hero-grid">
            <div>
              <AnimatedHeading text={'Vận hành hỗ trợ\nmượt mà & chuyên nghiệp.'} />
              <FadeIn delay={800} duration={1000}>
                <p className="lp-sub">
                  HiDesk giúp đội Service Operations quản lý ticket, SLA và khách hàng tập trung — nhanh hơn mỗi ngày.
                </p>
              </FadeIn>
              <FadeIn delay={1200} duration={1000}>
                <div className="lp-btns">
                  <button className="lp-btn-primary" onClick={goApp}>Bắt đầu ngay</button>
                  <button className="lp-btn-glass liquid-glass" onClick={goApp}>Khám phá tính năng</button>
                </div>
              </FadeIn>
            </div>

            <div className="lp-tag-wrap">
              <FadeIn delay={1400} duration={1000}>
                <div className="lp-tag liquid-glass">Ticket · SLA · Kanban · Báo cáo</div>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
