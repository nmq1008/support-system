import { initials } from '../lib/format';

const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2'];

export function Avatar({ name, size = 32 }: { name?: string; size?: number }) {
  const idx = (name || '?').charCodeAt(0) % COLORS.length;
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: `${COLORS[idx]}22`, color: COLORS[idx],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} />;
}
