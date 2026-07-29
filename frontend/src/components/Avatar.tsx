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

/** Overlapping stack of avatars (for multiple assignees). */
export function AvatarStack({ names, size = 22, max = 3 }: { names: string[]; size?: number; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--bg-surface)', borderRadius: '50%', display: 'inline-flex' }} title={n}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span style={{ marginLeft: -8, width: size, height: size, borderRadius: '50%', background: 'var(--bg-sunken)', border: '2px solid var(--bg-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: 'var(--text-secondary)' }}>+{extra}</span>
      )}
    </span>
  );
}
