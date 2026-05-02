interface TopbarProps {
  eyebrow?: string;
  title: string; // HTML 허용 (em, dot 등)
  sub?: string;
  right?: React.ReactNode;
}

export function Topbar({ eyebrow, title, sub, right }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {eyebrow && <div className="topbar-eyebrow">{eyebrow}</div>}
        <h1 className="topbar-title" dangerouslySetInnerHTML={{ __html: title }} />
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      <div className="topbar-right">{right}</div>
    </header>
  );
}
