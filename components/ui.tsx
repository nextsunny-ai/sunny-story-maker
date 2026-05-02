import { ICONS } from "@/lib/icons";

interface FieldProps {
  label?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
  span?: 1 | 2;
}

export function Field({ label, help, required, children, span }: FieldProps) {
  return (
    <div className={"field" + (span === 2 ? " col-span-2" : "")}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {help && <div className="field-help">{help}</div>}
    </div>
  );
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="tip">
      <div className="tip-icon">{ICONS.info}</div>
      <div>{children}</div>
    </div>
  );
}

interface BtnProps {
  kind?: "default" | "primary" | "coral";
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Btn({ kind = "default", icon, children, onClick, type, disabled }: BtnProps) {
  const cls = "btn" + (kind === "primary" ? " btn-primary" : kind === "coral" ? " btn-coral" : "");
  return (
    <button className={cls} onClick={onClick} type={type} disabled={disabled}>
      {icon && <span style={{ display: "inline-flex", width: 14, height: 14 }}>{icon}</span>}
      {children}
    </button>
  );
}
