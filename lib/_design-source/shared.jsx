/* ============================================================
   Shared layout components — Sidebar, Topbar, primitives
   ============================================================ */

const { useState, useEffect, useRef } = React;

/* ---------- Sidebar ---------- */
function Sidebar({ active, onNav, activeGenre, onGenreChange }) {
  const I = window.ICONS;
  const G = window.GENRES;
  const genre = activeGenre ? G.find(g => g.letter === activeGenre) : null;

  // The new "First Line" symbol
  const symbol = (
    <svg viewBox="0 0 64 64" fill="none" aria-label="Sunny symbol">
      {/* Sun rays — 5 short radiating lines above the horizon */}
      <line x1="32" y1="6"  x2="32" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="50" y1="14" x2="46" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="6"  y1="26" x2="12" y2="26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="58" y1="26" x2="52" y2="26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Horizon */}
      <line x1="10" y1="36" x2="54" y2="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      {/* Half sun */}
      <path d="M 18 36 A 14 14 0 0 1 46 36" fill="#EE6E55" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      {/* Foreground line */}
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
    </svg>
  );

  // ============================================================
  // GENRE MODE — 사이드바가 그 장르의 워크플로우로 변신
  // ============================================================
  if (genre) {
    // 임시: 진행 상태 (3번째 단계가 active, 앞 2개는 done)
    const activeStepIdx = 2;
    return (
      <aside className="sb">
        <div className="sb-brand">
          <div className="sb-brand-icon">{symbol}</div>
          <div className="sb-brand-text">
            <div className="sb-brand-name">Story Maker<span className="dot">.</span></div>
            <div className="sb-brand-by">BY <em>Sunny<span className="dot">.</span></em></div>
          </div>
        </div>

        {/* NOW WORKING ON 칩 */}
        <div className="sb-genre-mode">
          <div className="sb-genre-mode-icon">{I[genre.letter]}</div>
          <div className="sb-genre-mode-text">
            <div className="sb-genre-mode-eyebrow">NOW WORKING ON</div>
            <div className="sb-genre-mode-name">
              {genre.name.includes(' ') ? (
                <>{genre.name.split(' ')[0]} <em>{genre.name.split(' ').slice(1).join(' ')}</em></>
              ) : (
                <em>{genre.name}</em>
              )}
            </div>
          </div>
          <button
            className="sb-genre-mode-x"
            title="장르 모드 끄기"
            onClick={() => onGenreChange && onGenreChange(null)}
          >×</button>
        </div>

        {/* 워크플로우 단계 */}
        <div className="sb-section genre">— {genre.name.toUpperCase()} WORKFLOW</div>
        {genre.steps.map((s, i) => {
          const isActive = i === activeStepIdx;
          const isDone = i < activeStepIdx;
          return (
            <div
              key={s.n}
              className={"sb-genre-step" + (isActive ? " active" : "") + (isDone ? " done" : "")}
              onClick={() => onNav && onNav('write')}
            >
              <span className="sb-genre-step-num">{String(s.n).padStart(2, '0')}</span>
              <span className="sb-genre-step-name">{s.name}</span>
              {isDone && <span className="sb-genre-step-status">done</span>}
              {isActive && <span className="sb-genre-step-status">in</span>}
            </div>
          );
        })}

        {/* 표준 양식 출력 */}
        <div className="sb-export" onClick={() => onNav && onNav('package')}>
          <div className="sb-export-icon">{I.download}</div>
          <div className="sb-export-text">
            <div className="sb-export-label">표준 양식 출력</div>
            <div className="sb-export-fmt">{genre.standard}</div>
          </div>
        </div>

        {/* 공통 메뉴 */}
        <div className="sb-section" style={{marginTop: 14}}>— 공통</div>
        <div className="sb-link" data-active={active === 'pitch'} onClick={() => onNav && onNav('pitch')}>{I.pitch}<span>AI Pitch</span></div>
        <div className="sb-link" data-active={active === 'chat'} onClick={() => onNav && onNav('chat')}>{I.chat}<span>Co-Writer</span></div>
        <div className="sb-link" data-active={active === 'review'} onClick={() => onNav && onNav('review')}>{I.review}<span>Review</span></div>
        <div className="sb-link" data-active={active === 'library'} onClick={() => onNav && onNav('library')}>{I.library}<span>Library</span></div>

        <div className="sb-foot">
          <div className="sb-user">nextsunny@gmail.com</div>
          <button className="sb-logout">{I.logout}<span>로그아웃</span></button>
        </div>
      </aside>
    );
  }

  // ============================================================
  // DEFAULT MODE — 공통 메뉴
  // ============================================================
  const links = [
    { section: "WORKSPACE", items: [
      { id: "home", label: "Home", icon: I.home },
    ]},
    { section: "CREATE", items: [
      { id: "pitch", label: "AI Pitch", icon: I.pitch },
      { id: "package", label: "Plan Package", icon: I.package },
      { id: "adapt", label: "Adapt", icon: I.adapt },
      { id: "chat", label: "Co-Writer", icon: I.chat },
      { id: "osmu", label: "OSMU", icon: I.osmu },
    ]},
    { section: "REVIEW", items: [
      { id: "review", label: "Review", icon: I.review },
    ]},
    { section: "LIBRARY", items: [
      { id: "library", label: "Library", icon: I.library },
    ]},
    { section: "ACCOUNT", items: [
      { id: "admin", label: "Admin", icon: I.settings },
    ]},
  ];

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-brand-icon">{symbol}</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Story Maker<span className="dot">.</span></div>
          <div className="sb-brand-by">BY <em>Sunny<span className="dot">.</span></em></div>
        </div>
      </div>

      {links.map(group => (
        <React.Fragment key={group.section}>
          <div className="sb-section">{group.section}</div>
          {group.items.map(it => (
            <div
              key={it.id}
              className="sb-link"
              data-active={active === it.id}
              onClick={() => onNav && onNav(it.id)}
            >
              {it.icon}
              <span>{it.label}</span>
            </div>
          ))}
        </React.Fragment>
      ))}

      <div className="sb-foot">
        <div className="sb-user">nextsunny@gmail.com</div>
        <button className="sb-logout">{I.logout}<span>로그아웃</span></button>
      </div>
    </aside>
  );
}

/* ---------- Topbar ---------- */
function Topbar({ eyebrow, title, sub, right }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {eyebrow && <div className="topbar-eyebrow">{eyebrow}</div>}
        <h1 className="topbar-title" dangerouslySetInnerHTML={{ __html: title }} />
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      <div className="topbar-right">
        {right}
      </div>
    </header>
  );
}

/* ---------- Section heading ---------- */
function SectionHead({ num, title, sub, right }) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        {num !== undefined && <div className="section-num">— {String(num).padStart(2, '0')}</div>}
        <div>
          <div className="section-title">{title}</div>
          {sub && <div className="section-sub" style={{marginTop: 4}}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ---------- Primitives ---------- */
function Field({ label, help, required, children, span }) {
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

function Tip({ children }) {
  return (
    <div className="tip">
      <div className="tip-icon">{window.ICONS.info}</div>
      <div>{children}</div>
    </div>
  );
}

function Btn({ kind = "default", icon, children, onClick, type }) {
  const cls = "btn" + (kind === "primary" ? " btn-primary" : kind === "coral" ? " btn-coral" : "");
  return (
    <button className={cls} onClick={onClick} type={type}>
      {icon && <span style={{display:'inline-flex', width: 14, height: 14}}>{icon}</span>}
      {children}
    </button>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.SectionHead = SectionHead;
window.Field = Field;
window.Tip = Tip;
window.Btn = Btn;
