export default function Spinner({ full = false, label = 'Loading' }) {
  const ring = (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-line border-t-signal"
    />
  );
  return full ? <div className="flex h-full min-h-[200px] items-center justify-center">{ring}</div> : ring;
}
