"use client";

/**
 * MediumFieldRenderer — V2 디자인 시스템 안에서 V1 매체 fields 자동 렌더.
 *
 * - V2의 Field 컴포넌트 + field-input/field-select/field-textarea + chip 클래스만 사용.
 * - 새로운 디자인/색/폰트/클래스 X.
 * - 모든 field type (text/textarea/select/multiselect/number) 지원.
 */

import { Field } from "@/components/ui";
import type { Field as WorkflowField } from "@/lib/workflows";

export type FieldValue = string | string[] | number;
export type FieldValues = Record<string, FieldValue>;

interface Props {
  fields: WorkflowField[];
  values: FieldValues;
  onChange: (key: string, value: FieldValue) => void;
}

export function MediumFieldRenderer({ fields, values, onChange }: Props) {
  return (
    <div className="form-grid">
      {fields.map((f) => {
        const current = values[f.key];
        switch (f.type) {
          case "text":
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <input
                  className="field-input"
                  value={typeof current === "string" ? current : (current ?? "").toString()}
                  placeholder={f.placeholder}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              </Field>
            );

          case "textarea":
            return (
              <Field key={f.key} label={f.label} help={f.help} span={2}>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={typeof current === "string" ? current : (current ?? "").toString()}
                  placeholder={f.placeholder}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              </Field>
            );

          case "select": {
            const def = (typeof f.default === "string" && f.default) ? f.default : "";
            const value = typeof current === "string" ? current : def;
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <select
                  className="field-select"
                  value={value}
                  onChange={(e) => onChange(f.key, e.target.value)}
                >
                  {!value && <option value="">선택 —</option>}
                  {(f.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
            );
          }

          case "multiselect": {
            const arr = Array.isArray(current) ? current : [];
            const toggle = (opt: string) => {
              const next = arr.includes(opt)
                ? arr.filter((x) => x !== opt)
                : [...arr, opt];
              onChange(f.key, next);
            };
            return (
              <Field key={f.key} label={f.label} help={f.help} span={2}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(f.options || []).map((opt) => {
                    const on = arr.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={"chip" + (on ? " coral" : "")}
                        onClick={() => toggle(opt)}
                        style={{ cursor: "pointer", borderStyle: "solid" }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Field>
            );
          }

          case "number": {
            const value = typeof current === "number"
              ? current
              : (typeof current === "string" && current !== "" ? Number(current) : (typeof f.default === "number" ? f.default : 0));
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <input
                  type="number"
                  className="field-input"
                  value={Number.isFinite(value as number) ? (value as number) : 0}
                  min={f.min}
                  max={f.max}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    const n = e.target.value === "" ? 0 : Number(e.target.value);
                    onChange(f.key, Number.isFinite(n) ? n : 0);
                  }}
                />
              </Field>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

/** 매체 fields의 기본값 dict 만들기 (default 값 채우기) */
export function buildDefaultValues(fields: WorkflowField[]): FieldValues {
  const out: FieldValues = {};
  for (const f of fields) {
    if (f.type === "multiselect") {
      out[f.key] = [];
    } else if (f.type === "number") {
      out[f.key] = typeof f.default === "number" ? f.default : 0;
    } else {
      out[f.key] = typeof f.default === "string" ? f.default : "";
    }
  }
  return out;
}
