"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { RESOURCE_CATEGORIES, type ResourceCategory, type ResourceItem } from "@/lib/resources/data";

export default function ResourcesPage() {
  return (
    <AppShell>
      <ResourcesMain />
    </AppShell>
  );
}

function ResourcesMain() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ResourceItem | null>(null);
  const [search, setSearch] = useState("");

  const category = activeCat ? RESOURCE_CATEGORIES.find(c => c.id === activeCat) : null;

  const filtered = useMemo<ResourceItem[]>(() => {
    if (!category) return [];
    if (!search.trim()) return category.items;
    const q = search.toLowerCase();
    return category.items.filter(it =>
      it.title.toLowerCase().includes(q) ||
      it.body.toLowerCase().includes(q) ||
      (it.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [category, search]);

  const onCopy = async (text: string, btn?: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "✓ 복사됨";
        setTimeout(() => { btn.textContent = orig; }, 1200);
      }
    } catch { /* ignore */ }
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="LIBRARY"
        title='참고 <em style="font-style:italic">자료실</em><span class="dot">.</span>'
        sub="캐릭터·직업·시대·비유·장소 — 본문 쓸 때 작가노트에 박거나 채팅 input에 붙이는 식 참조용. 한국 작가가 자주 쓰는 풍속·문화 정리."
      />

      {!activeCat ? (
        <>
          <SectionHead num={1} title="카테고리" sub={`${RESOURCE_CATEGORIES.length}개 카테고리 — 각 자료 = 작가가 본문에 직접 가져다 쓰는 식`} />
          <div style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            marginTop: 12,
          }}>
            {RESOURCE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCat(cat.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "var(--card-soft)",
                  padding: 18,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minHeight: 140,
                }}
              >
                <div style={{ fontSize: 28 }}>{cat.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>{cat.hint}</div>
                <div style={{ marginTop: "auto", fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.05em" }}>
                  {cat.items.length}개 자료
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <CategoryView
          category={category as ResourceCategory}
          items={filtered}
          search={search}
          onSearch={setSearch}
          onBack={() => { setActiveCat(null); setActiveItem(null); setSearch(""); }}
          onItem={setActiveItem}
        />
      )}

      {activeItem && (
        <ItemModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onCopy={onCopy}
        />
      )}
    </main>
  );
}

function CategoryView({
  category, items, search, onSearch, onBack, onItem,
}: {
  category: ResourceCategory;
  items: ResourceItem[];
  search: string;
  onSearch: (q: string) => void;
  onBack: () => void;
  onItem: (it: ResourceItem) => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--ink-3)",
          }}
        >
          ← 카테고리
        </button>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{category.emoji} {category.name}</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="검색 — 제목·본문·태그"
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="field-input"
          style={{ maxWidth: 360 }}
        />
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-4)" }}>
          {search ? "검색 결과 없음" : "자료 없음"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {items.map(it => {
            const cardContent = (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6 }}>
                  {it.title}
                  {it.url && <span style={{ fontSize: 11, color: "var(--coral)" }}>↗</span>}
                </div>
                {it.body && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {it.body}
                  </div>
                )}
                {it.url && (
                  <div style={{ fontSize: 11, color: "var(--coral-deep)", fontWeight: 600, marginTop: 4 }}>
                    {it.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </div>
                )}
                {it.tags && it.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: "auto" }}>
                    {it.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 10, padding: "2px 6px", background: "var(--coral-soft)",
                        color: "var(--coral-deep)", borderRadius: 4, fontWeight: 600,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </>
            );
            const cardStyle: React.CSSProperties = {
              textAlign: "left",
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--card-soft)",
              padding: 16,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
            };
            // ★ url 박힌 항목 = a 태그 = 새 탭 / 그 외 = 모달
            if (it.url) {
              return (
                <a
                  key={it.id}
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={cardStyle}
                  title={`${it.url} (새 탭에서 열림)`}
                >
                  {cardContent}
                </a>
              );
            }
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onItem(it)}
                style={cardStyle}
              >
                {cardContent}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function ItemModal({
  item, onClose, onCopy,
}: {
  item: ResourceItem;
  onClose: () => void;
  onCopy: (text: string, btn?: HTMLElement) => void;
}) {
  return (
    <div
      role="dialog"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto",
          background: "var(--card)", borderRadius: 16, padding: 24,
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, flex: 1, lineHeight: 1.4 }}>{item.title}</div>
          <button type="button" onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--line)", borderRadius: 6,
            padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--ink-3)",
          }}>✕</button>
        </div>
        {item.body && (
          <div style={{ marginTop: 14, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {item.body}
          </div>
        )}
        {item.tags && item.tags.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.tags.map(t => (
              <span key={t} style={{
                fontSize: 11, padding: "3px 8px", background: "var(--coral-soft)",
                color: "var(--coral-deep)", borderRadius: 4, fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={(e) => onCopy(`${item.title}\n\n${item.body}`, e.currentTarget)}
            style={{
              padding: "8px 14px", fontSize: 12, fontWeight: 600,
              background: "var(--coral)", color: "#fff",
              border: "1px solid var(--coral)", borderRadius: 6, cursor: "pointer",
            }}
          >
            📋 본문 복사 (작가노트·채팅에 붙이기)
          </button>
        </div>
      </div>
    </div>
  );
}
