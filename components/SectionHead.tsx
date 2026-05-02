interface SectionHeadProps {
  num?: number;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

export function SectionHead({ num, title, sub, right }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        {num !== undefined && <div className="section-num">— {String(num).padStart(2, "0")}</div>}
        <div>
          <div className="section-title">{title}</div>
          {sub && <div className="section-sub" style={{ marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}
