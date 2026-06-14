interface StarRatingProps {
  rating: number; // 0–5
  size?: number;
  showValue?: boolean;
}

function Star({ fill, size }: { fill: number; size: number }) {
  // fill: 0 = empty, 1 = full, fraction = partial
  const id = `star-${Math.random().toString(36).slice(2)}`;
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${pct}%`} stopColor="#f59e0b" />
          <stop offset={`${pct}%`} stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.9l-5.2 2.72.99-5.8L1.58 7.62l5.82-.85L10 1.5z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export default function StarRating({
  rating,
  size = 16,
  showValue = false,
}: StarRatingProps) {
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      title={`${rating} out of 5`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={rating - i} />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-slate-600">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
