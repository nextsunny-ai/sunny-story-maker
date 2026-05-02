/* ============================================================
   Screen 5: CHAT — 보조작가 (실시간 의뢰)
   ============================================================ */

function ChatScreen() {
  const I = window.ICONS;
  const quick = [
    { id: "name",   label: "이름 짓기" },
    { id: "line",   label: "대사 다듬기" },
    { id: "meta",   label: "비유 / 묘사" },
    { id: "scene",  label: "장면 만들기" },
    { id: "review", label: "한 단락 검토" },
    { id: "head",   label: "씬 헤딩" },
  ];

  const messages = [
    { from: "writer", text: "주인공 이름 후보 5개만. 30대 여성, 직업은 광고기획자, 차분하지만 단단한 인상." },
    { from: "ai",     text: "차분하면서도 단단한 느낌으로 5개 추천드립니다.\n\n· 한지원 — 무난·실용·드라마 톤\n· 윤서아 — 차분 + 현대적\n· 정해린 — 단정 + 광고업계 톤\n· 이도윤 — 중성적, 단단\n· 박세영 — 균형감 있음 (현실적)\n\n이 중에 끌리는 게 있으시면 그 이름으로 캐릭터 시트 더 깊게 짜드릴게요." },
    { from: "writer", text: "이도윤 좋네. 그럼 이도윤이 옛 연인을 결혼식에서 다시 만나는 첫 만남 신, 짧게 한 컷만." },
  ];

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — CO-WRITER"
        title='보조<em style="font-style:italic">작가</em>'
        sub="실시간 의뢰. 막힐 때마다 한 줄 묻고, 한 줄 받고, 다시 본문으로 돌아가세요."
      />

      <div className="write-grid">
        {/* 좌측 — 컨텍스트 */}
        <aside className="write-aside">
          <div className="aside-block">
            <div className="aside-h">작업 컨텍스트</div>
            <Field label="작품"><select className="field-select"><option>트랑로제</option><option>(없음)</option></select></Field>
            <Field label="매체"><select className="field-select"><option>TV 드라마 (16부작)</option><option>(미지정)</option></select></Field>
          </div>

          <div className="aside-block">
            <div className="aside-h">기억해야 할 것</div>
            <textarea className="field-textarea" rows="4" defaultValue="시대: 현대 서울. 주인공: 이도윤(여, 30대, 광고기획자). 첫사랑 재회 후 매일 마주침. 톤: 차분 · 무거움 · 로맨틱."/>
            <div className="field-help">보조작가가 답할 때 항상 참고합니다.</div>
          </div>

          <div className="aside-block">
            <div className="aside-h">빠른 의뢰</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6}}>
              {quick.map(q => (
                <button key={q.id} className="btn" style={{padding:'8px 12px', fontSize: 12, justifyContent:'center'}}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aside-block">
            <div className="aside-h">현재 세션</div>
            <div className="kv"><div className="kv-k">메시지</div><div className="kv-v">12</div></div>
            <div className="kv"><div className="kv-k">시작</div><div className="kv-v">14:22</div></div>
            <div className="kv"><div className="kv-k">저장됨</div><div className="kv-v">방금</div></div>
            <div style={{display:'flex', gap: 6, marginTop: 4}}>
              <Btn icon={I.trash}>비우기</Btn>
              <Btn icon={I.save}>저장</Btn>
            </div>
          </div>
        </aside>

        {/* 우측 — 대화 */}
        <section style={{display:'flex', flexDirection:'column', gap: 14}}>
          <div style={{
            display:'flex', flexDirection:'column', gap: 14,
            padding: '24px',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            minHeight: 460,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display:'flex', flexDirection:'column',
                alignItems: m.from === 'writer' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  color: m.from === 'writer' ? 'var(--coral-deep)' : 'var(--ink-5)',
                  marginBottom: 4, textTransform: 'uppercase'
                }}>
                  {m.from === 'writer' ? '나' : 'SUNNY 보조작가'}
                </div>
                <div style={{
                  maxWidth: '78%',
                  padding: '12px 16px',
                  borderRadius: m.from === 'writer' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.from === 'writer' ? 'var(--coral-soft)' : 'var(--bg-soft)',
                  color: 'var(--ink-2)',
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid ' + (m.from === 'writer' ? 'rgba(238,110,85,0.15)' : 'var(--line)'),
                  fontFamily: m.from === 'ai' ? 'var(--font-display)' : 'var(--font-ui)',
                  fontStyle: m.from === 'ai' ? 'italic' : 'normal',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* 입력바 */}
          <div style={{
            display:'flex', alignItems:'center', gap: 10,
            padding: 8,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <input
              className="field-input"
              placeholder="보조작가에게 말 걸기 — 이름·대사·장면·검토 무엇이든"
              style={{border:'none', boxShadow:'none', background:'transparent', flex: 1}}
            />
            <button className="btn btn-coral" style={{padding:'10px 14px', borderRadius: 999}}>
              <span style={{display:'inline-flex', width: 14, height: 14}}>{I.send}</span>
              보내기
            </button>
          </div>

          <div style={{fontSize: 11, color: 'var(--ink-5)', textAlign:'center'}}>
            Shift + Enter 줄바꿈 · Enter 전송 · 한 번에 한 가지씩 물으면 정확합니다
          </div>
        </section>
      </div>

      <div style={{height: 60}}></div>
    </main>
  );
}

window.ChatScreen = ChatScreen;
