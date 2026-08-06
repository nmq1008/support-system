/** Lightweight dependency-free SVG charts for the dashboard. */

interface Slice { label: string; value: number; color: string; }

export function DonutChart({ data, size = 160 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 14;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const el = (
              <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={d.color} strokeWidth={16}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x={cx} y={cx - 2} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text-primary)">{total}</text>
        <text x={cx} y={cx + 16} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">total</text>
      </svg>
      <div style={{ display: 'grid', gap: 6 }}>
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
            <span style={{ color: 'var(--text-secondary)', minWidth: 90 }}>{d.label}</span>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, height = 180 }: { data: Slice[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height, padding: '8px 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <b style={{ fontSize: 12 }}>{d.value}</b>
          <div style={{ width: '60%', maxWidth: 40, height: `${(d.value / max) * 100}%`, minHeight: 3, background: d.color, borderRadius: '6px 6px 0 0', transition: 'height .3s' }} />
          <span title={d.label} style={{ fontSize: 12, color: 'var(--text-secondary)', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Gauge({ value, size = 150 }: { value: number; size?: number }) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const circ = Math.PI * r; // half circle
  const dash = (value / 100) * circ;
  const color = value >= 90 ? '#19B36E' : value >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={size} height={size / 1.6} viewBox={`0 0 ${size} ${size / 1.6}`}>
      <path d={`M12 ${cx} A ${r} ${r} 0 0 1 ${size - 12} ${cx}`} fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round" />
      <path d={`M12 ${cx} A ${r} ${r} 0 0 1 ${size - 12} ${cx}`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      <text x={cx} y={cx - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text-primary)">{value}%</text>
    </svg>
  );
}

interface LinePoint { date: string; created: number; closed: number; }
export function LineChart({ data, height = 200 }: { data: LinePoint[]; height?: number }) {
  const w = Math.max(320, data.length * 44);
  const pad = 28;
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.closed]));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const path = (key: 'created' | 'closed') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ');
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={w} height={height}>
        <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="var(--border)" />
        <path d={path('created')} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        <path d={path('closed')} fill="none" stroke="#19B36E" strokeWidth={2} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.created)} r={3} fill="var(--color-primary)" />
            <circle cx={x(i)} cy={y(d.closed)} r={3} fill="#19B36E" />
            {i % Math.ceil(data.length / 7 || 1) === 0 && (
              <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.date.slice(5)}</text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 4 }}>
        <span><span style={{ color: 'var(--color-primary)' }}>●</span> created</span>
        <span><span style={{ color: '#19B36E' }}>●</span> closed</span>
      </div>
    </div>
  );
}
