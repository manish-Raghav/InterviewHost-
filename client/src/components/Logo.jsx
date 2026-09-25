export default function Logo({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="1" y="4" width="15" height="15" rx="4" fill="#0E7C7B" />
        <rect x="10" y="8" width="15" height="15" rx="4" fill={light ? '#ECEFF3' : '#16202F'} opacity="0.92" />
      </svg>
      <span className={`font-display text-lg font-bold ${light ? 'text-white' : 'text-ink'}`}>InterviewHub</span>
    </span>
  );
}
