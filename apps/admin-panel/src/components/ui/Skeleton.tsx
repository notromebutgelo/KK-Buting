export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[color:var(--surface-muted)] ${className}`} />;
}
