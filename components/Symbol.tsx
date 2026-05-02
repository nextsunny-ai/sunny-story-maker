/**
 * First Line — Story Maker brand symbol
 * 지평선 + 반쪽 해. "첫 줄"이라는 컨셉이 로고에 녹아있음.
 */
export function Symbol({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-label="Sunny symbol" width={size} height={size}>
      <line x1="32" y1="6"  x2="32" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="50" y1="14" x2="46" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="6"  y1="26" x2="12" y2="26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="58" y1="26" x2="52" y2="26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="10" y1="36" x2="54" y2="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 18 36 A 14 14 0 0 1 46 36" fill="#EE6E55" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
    </svg>
  );
}
