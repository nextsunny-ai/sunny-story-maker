"""AI 기획 모드 — 한 줄 아이디어 → 풀 트리트먼트
사용자 최소 입력 (한 줄 + 장르) → AI 작가가 처음부터 끝까지"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules import sori_client, exporter, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🪄</span>AI 기획 모드</div>
        <div class="app-header-version">한 줄 아이디어 → 풀 기획</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background: var(--gradient-soft); padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <strong style="color: #2563EB;">사용법</strong>
    한 줄 아이디어와 장르만 정해주세요. AI 작가가 로그라인 → 트리트먼트 → 시놉시스 → 첫 부분 샘플까지 처음부터 끝까지 작성합니다.
    </div>
    """,
    unsafe_allow_html=True,
)

# 입력
st.markdown("## 1. 아이디어 입력")
idea = st.text_area(
    "한 줄 아이디어",
    height=80,
    placeholder="예) 조선시대 요괴 사냥꾼이 현대 서울로 떨어지면서 벌어지는 일",
)

col1, col2 = st.columns([2, 1])
with col1:
    genre_choice = st.selectbox("장르", list_genre_names())
    genre_letter = parse_genre_choice(genre_choice)
    genre = GENRES[genre_letter]
with col2:
    project_name = st.text_input("작품명 (저장용)", placeholder="예: 조선요괴 서울생존기")

# 장르 정보 미리보기
with st.expander(f"📖 {genre['name']} 핵심 가이드", expanded=False):
    st.markdown(f"- **분량 표준**: {genre['분량_표준']}")
    st.markdown(f"- **양식**: {genre['포맷']}")
    st.markdown(f"- **핵심 전략**:")
    for s in genre["핵심_전략"][:3]:
        st.markdown(f"  - {s}")

# 실행
st.markdown("## 2. 기획 시작")
if st.button("🪄 AI 작가에게 맡기기", type="primary", use_container_width=True, disabled=not idea):
    workflow = get_workflow(genre_letter)
    prompt = sori_client.build_ai_pitch_prompt(idea, genre, workflow)

    # 진행 상태 + 실시간 텍스트
    import time
    start_ts = time.time()

    status_box = st.empty()
    timer_box = st.empty()
    result_box = st.empty()

    status_box.info(f"🪄 AI 작가가 **{genre['name']}** 기획 중... (로그라인 → 트리트먼트 → 시놉시스 → 첫 부분 샘플)")

    result = ""
    chunk_count = 0
    try:
        for chunk in sori_client.stream_sori(prompt, max_tokens=8000):
            result += chunk
            chunk_count += 1
            # 글자가 흘러내리는 게 보이게
            result_box.markdown(result + " ▌")
            # 5청크마다 경과 시간 갱신
            if chunk_count % 5 == 0:
                elapsed = int(time.time() - start_ts)
                timer_box.caption(f"⏱ 경과 {elapsed}초 · 글자 {len(result):,}자")
    except Exception as e:
        result_box.error(f"[오류] {e}")
        result = result or f"[오류] {e}"

    elapsed_total = int(time.time() - start_ts)
    timer_box.caption(f"✓ 완료 · 총 {elapsed_total}초 · {len(result):,}자")
    status_box.success(f"✓ 기획 완료 ({elapsed_total}초)")
    result_box.empty()  # 아래 결과 영역에서 다시 그릴 거라 여기선 비움

    st.session_state.ai_pitch_result = {
        "idea": idea,
        "genre": genre,
        "result": result,
        "project": project_name or f"AI기획_{datetime.now().strftime('%m%d_%H%M')}",
    }

# 결과
if "ai_pitch_result" in st.session_state:
    r = st.session_state.ai_pitch_result
    st.markdown("---")
    st.markdown("## ✨ 기획 결과")
    st.markdown(r["result"])

    col_a, col_b, col_c = st.columns(3)
    with col_a:
        if st.button("💾 v1로 저장", use_container_width=True):
            meta = storage.save_version(
                r["project"],
                r["result"],
                metadata={"type": "ai_pitch", "idea": r["idea"], "genre": r["genre"]["code"]},
                direction=f"AI 기획: {r['idea']}",
            )
            st.success(f"✓ {r['project']} v{meta['version']} 저장")

    with col_b:
        if st.button("📥 .docx 다운로드", use_container_width=True):
            doc_bytes = exporter.export_to_docx(
                title=r["project"],
                body=r["result"],
                genre_letter=parse_genre_choice(r["genre"]["name"]),
                export_format=get_workflow(parse_genre_choice(r["genre"]["name"]))["export_format"],
            )
            st.download_button("💾 다운로드", data=doc_bytes,
                               file_name=f"{r['project']}_v1.docx",
                               mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    with col_c:
        if st.button("✏️ 집필로 이어가기", use_container_width=True):
            st.session_state.cowrite_seed = r
            st.switch_page("pages/2_집필.py")

    # ========== 추가 산출물 생성 (B 통합) ==========
    st.markdown("---")
    st.markdown("### 📦 추가 산출물 생성")
    st.caption("작품 폴더에 자동 저장됩니다 (output/<작품명>/artifacts/).")

    art_buttons = [
        ("characters", "👥 캐릭터 시트",  sori_client.build_characters_prompt, 5000),
        ("worldview",  "🌐 세계관 정리서", sori_client.build_worldview_prompt, 4000),
        ("treatment",  "📝 트리트먼트",   sori_client.build_treatment_prompt, 6000),
        ("episodes",   "📺 회차 구성표",  sori_client.build_episodes_prompt, 7000),
        ("proposal",   "📑 기획안",       sori_client.build_proposal_prompt, 5000),
        ("script",     "🎬 대본 샘플",    sori_client.build_script_prompt, 6000),
    ]

    art_cols = st.columns(3)
    for i, (key, label, builder, max_tok) in enumerate(art_buttons):
        col = art_cols[i % 3]
        with col:
            if st.button(label, key=f"art_{key}", use_container_width=True):
                with st.spinner(f"{label} 작성 중..."):
                    prior = {"AI 기획 결과": r["result"]}
                    prompt = builder(r["idea"], r["genre"], prior=prior)
                    response = sori_client.call_sori(prompt, max_tokens=max_tok)
                    storage.save_artifact(
                        r["project"], key, response,
                        metadata={"genre": r["genre"]["code"], "idea": r["idea"], "from": "ai_pitch"},
                    )
                    st.session_state[f"art_result_{key}"] = response
                    st.success(f"✓ {label} 저장됨 → output/{r['project']}/artifacts/")

    # 생성된 산출물 표시
    for key, label, _, _ in art_buttons:
        result_key = f"art_result_{key}"
        if result_key in st.session_state:
            with st.expander(f"📄 {label}", expanded=False):
                st.markdown(st.session_state[result_key])
                st.download_button(
                    f"📥 {key}.md 다운로드",
                    data=st.session_state[result_key].encode("utf-8"),
                    file_name=f"{r['project']}_{key}.md",
                    mime="text/markdown",
                    key=f"dl_art_{key}",
                )

    # 산출물 현황
    st.markdown("### 📂 작품 폴더 현황")
    artifacts = storage.list_artifacts(r["project"])
    info_line = " · ".join([
        f"**{info['name']}** v{info['latest_version']}" if info["has"] else f"~~{info['name']}~~"
        for k, info in sorted(artifacts.items(), key=lambda x: x[1]["order"])
    ])
    st.caption(info_line)