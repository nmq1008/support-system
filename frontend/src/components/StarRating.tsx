interface Props { value: number; onChange?: (v: number) => void; size?: number; readOnly?: boolean; }

/** 1–5 star rating (interactive or read-only). */
export function StarRating({ value, onChange, size = 20, readOnly }: Props) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onClick={() => !readOnly && onChange?.(s)}
          style={{ cursor: readOnly ? 'default' : 'pointer', color: s <= value ? '#F59E0B' : 'var(--border-strong)', fontSize: size, lineHeight: 1 }}
          role={readOnly ? undefined : 'button'}
          aria-label={`${s} star`}
        >
          ★
        </span>
      ))}
    </span>
  );
}
