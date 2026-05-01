"""리뷰 모드 — 배급사 다중 타겟 리뷰 (★ 핵심 셀링포인트)
- 첨부 파일 자동 분석
- 3개 타겟별 별도 리뷰 (10대/20대/30대 등)
- 결과 .docx 내보내기
- 같은 작품 v1, v2, v3 리뷰 비교
"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules import sori_client, file_parser, humanizer, exporter, storage, profile as prof, learning, reviewers
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import SCRIPT_FONTS

# CSS
css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
# ========== 헤더 ==========
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🔍</span>리뷰 모드</div>
        <div class="app-header-version">배급사 다중 타겟 리뷰</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background: var(--gradient-soft); padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <strong style="color: #2563EB;">왜 이 모드?</strong>
    배급사가 작가에게 보내는 다중 타겟 리뷰를 그대로. 연령·라이프스타일·취향별로 3가지 타겟이 본다고 가정하고 별도 리뷰합니다. 작가가 가장 궁금해하는 영역을 즉시 무한 반복 가능하게.
    </div>
    """,
    unsafe_allow_html=True,
)

# ========== 1. 첨부 ==========
st.markdown("## 1. 작품 첨부")

upload_method = st.radio(
    "입력 방식",
    ["파일 업로드 (.docx/.pdf/.txt)", "텍스트 직접 붙여넣기", "저장된 프로젝트에서 불러오기"],
    horizontal=True,
)

text_to_review = ""
project_name_default = ""

if upload_method.startswith("파일"):
    uploaded = st.file_uploader(
        "시나리오 / 트리트먼트 / 시놉시스 파일",
        type=["docx", "pdf", "txt", "md", "fountain", "fdx"],
    )
    if uploaded:
        with st.spinner("파일 분석 중..."):
            text_to_review = file_parser.parse_uploaded_file(uploaded)
            project_name_default = Path(uploaded.name).stem

elif upload_method.startswith("텍스트"):
    project_name_default = st.text_input("작품 제목", placeholder="예: 트랑로제")
    text_to_review = st.text_area(
        "본문 붙여넣기",
        height=300,
        placeholder="시나리오 / 트리트먼트 / 회차 본문을 붙여넣으세요...",
    )

else:  # 저장된 프로젝트
    projects = storage.list_projects()
    if projects:
        proj_names = [p["name"] for p in projects]
        chosen = st.selectbox("프로젝트 선택", proj_names)
        proj = next(p for p in projects if p["name"] == chosen)
        versions = storage.list_versions(chosen)
        v_options = [f"v{v['version']} ({v['saved_at'][:10]})" for v in versions]
        v_choice = st.selectbox("버전 선택", v_options)
        if v_choice:
            v_num = int(v_choice.split()[0][1:])
            text_to_review = storage.load_version(chosen, v_num)
            project_name_default = chosen
    else:
        st.info("저장된 프로젝트가 없습니다.")


if text_to_review:
    word_stats = file_parser.get_word_count(text_to_review)
    auto_genre_letter = file_parser.estimate_genre(text_to_review)
    auto_genre = GENRES.get(auto_genre_letter)

    cols = st.columns(4)
    cols[0].metric("총 글자 수", f"{word_stats['chars_with_spaces']:,}")
    cols[1].metric("줄 수", f"{word_stats['lines']:,}")
    cols[2].metric("단락 수", f"{word_stats['paragraphs']:,}")
    cols[3].metric("자동 식별 장르", f"{auto_genre_letter}. {auto_genre['name']}" if auto_genre else "?")

    with st.expander("내용 미리보기"):
        st.text(text_to_review[:1500] + ("..." if len(text_to_review) > 1500 else ""))


# ========== 2. 장르 + 타겟 설정 ==========
if text_to_review:
    st.markdown("## 2. 장르 + 타겟 설정")

    col_g, col_p = st.columns([1, 1])
    with col_g:
        auto_idx = list(GENRES.keys()).index(auto_genre_letter) if auto_genre_letter in GENRES else 0
        genre_choice = st.selectbox(
            "장르 (자동 식별 결과 — 수정 가능)",
            list_genre_names(),
            index=auto_idx,
        )
        genre_letter = parse_genre_choice(genre_choice)
        genre = GENRES[genre_letter]

    with col_p:
        project_name = st.text_input("작품명 (저장용)", value=project_name_default)

    st.markdown("### 리뷰어 선택")
    st.caption("한 명씩 받고, 다른 시각도 보고 싶으면 추가하세요. 한 번에 한 그룹의 시각을 깊게.")

    all_reviewers = reviewers.list_all()
    recommended = reviewers.recommend_for_genre(genre_letter, limit=1)
    default_id = recommended[0]["id"] if recommended else all_reviewers[0]["id"]

    # 라디오 버튼: 라이브러리 / 직접 작성
    select_mode = st.radio("선택 방식", ["라이브러리에서", "직접 작성"], horizontal=True)

    target_inputs = []

    if select_mode == "라이브러리에서":
        all_options = [r["name"] for r in all_reviewers]
        # 추천 1명을 기본 선택
        default_idx = next((i for i, r in enumerate(all_reviewers) if r["id"] == default_id), 0)
        chosen_name = st.selectbox(
            f"🎯 추천: 매체+장르 맞춤 ({genre['name']})",
            all_options,
            index=default_idx,
        )
        chosen = next(r for r in all_reviewers if r["name"] == chosen_name)

        # 선택된 리뷰어 정보 보여주기
        st.markdown(
            f"""<div style="background: var(--bg-secondary); padding: 14px 18px; border-radius: 10px; margin-top: 10px;">
            <div style="font-weight: 600; margin-bottom: 6px;">{chosen['name']}</div>
            <div style="font-size: 13px; color: #64748B;">
            <strong>좋아함</strong>: {chosen['loves']}<br>
            <strong>싫어함</strong>: {chosen['hates']}<br>
            <strong>관점</strong>: {chosen['voice_tone']}
            </div></div>""",
            unsafe_allow_html=True,
        )
        target_inputs.append(reviewers.to_target_dict(chosen))

    else:  # 직접 작성
        c_name = st.text_input("그룹 라벨", placeholder="예: 30대 도시 비혼 여성, OTT 헤비")
        if c_name:
            c_age = st.text_input("연령대")
            c_life = st.text_input("거주/직업")
            c_pref = st.text_input("취향")
            c_cons = st.text_input("소비 패턴")
            c_loves = st.text_input("좋아하는 패턴")
            c_hates = st.text_input("싫어하는 패턴")
            c_voice = st.text_input("관점/접근", placeholder="예: 솔직·분석적·SNS 트렌드 민감")
            target_inputs.append({
                "name": c_name,
                "age": c_age, "gender": "", "lifestyle": c_life,
                "preference": c_pref, "consumption": c_cons,
                "loves": c_loves, "hates": c_hates,
                "voice_tone": c_voice or "자연스러운 시각",
            })

    if not target_inputs:
        st.warning("리뷰어를 선택하거나 작성해주세요")

    # ========== 3. 리뷰 실행 ==========
    st.markdown("## 3. 리뷰 실행")
    valid = all(t["name"] for t in target_inputs)

    if not valid:
        st.warning("3개 타겟 모두 이름을 입력해주세요.")
    else:
        if st.button("🚀 다중 타겟 리뷰 시작", type="primary", use_container_width=True):
            with st.spinner("AI 작가가 3개 타겟의 시각으로 리뷰하는 중... (1~2분 소요)"):
                prompt = sori_client.build_targeted_review_prompt(
                    text_to_review,
                    targets=target_inputs,
                    genre=genre,
                )
                review_result = sori_client.call_sori(prompt, max_tokens=8000)

                # AI투 검출 (원본 텍스트 대상)
                findings = humanizer.detect(text_to_review)

                st.session_state.last_review = {
                    "project": project_name,
                    "genre": genre,
                    "targets": target_inputs,
                    "review": review_result,
                    "findings": findings,
                    "ai_score": humanizer.severity_score(findings),
                    "text": text_to_review,
                }

# ========== 4. 결과 ==========
if "last_review" in st.session_state:
    r = st.session_state.last_review

    st.markdown("---")
    st.markdown("## 📊 리뷰 결과")

    # 메트릭
    cols = st.columns(4)
    cols[0].metric("AI투 점수", f"{r['ai_score']}/100", delta="낮을수록 좋음", delta_color="inverse")
    cols[1].metric("타겟 수", len(r["targets"]))
    cols[2].metric("장르", r["genre"]["name"])
    cols[3].metric("검출 패턴", len(r["findings"]))

    # 다중 타겟 리뷰 본문
    st.markdown("### 다중 타겟 리뷰")
    st.markdown(r["review"])

    # AI투 검출 결과
    if r["findings"]:
        with st.expander(f"🔍 AI투 검출 {len(r['findings'])}개 (humanizer 6패턴)", expanded=False):
            summary = humanizer.summary_by_pattern(r["findings"])
            for pattern, count in summary.items():
                st.markdown(f"- **{pattern}**: {count}개")

            st.markdown("---")
            st.markdown("**원문 하이라이트**")
            st.markdown(
                f'<div class="script-body" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">'
                f'{humanizer.highlight_html(r["text"][:3000], r["findings"][:30])}'
                f'</div>',
                unsafe_allow_html=True,
            )

    # 액션 버튼
    st.markdown("### 다음 단계")
    col_act = st.columns(4)

    with col_act[0]:
        # .docx 내보내기
        if st.button("📥 리뷰 .docx 다운로드", use_container_width=True):
            review_doc = exporter.export_to_docx(
                title=f"{r['project']} - 다중 타겟 리뷰",
                body=r["review"],
                genre_letter="G",
                export_format="documentary_cuesheet",  # 리뷰 = 줄글 스타일
                author="AI 작가",
            )
            st.download_button(
                "💾 다운로드",
                data=review_doc,
                file_name=f"{r['project']}_리뷰_{datetime.now().strftime('%Y%m%d')}.docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

    with col_act[1]:
        if st.button("🔄 같은 장르 각색하기", use_container_width=True):
            st.session_state.adapt_source = {
                "text": r["text"],
                "project": r["project"],
                "genre": r["genre"],
                "mode": "same_genre",
            }
            st.switch_page("pages/3_각색.py")

    with col_act[2]:
        if st.button("🌐 다른 장르 변환 추천", use_container_width=True):
            st.session_state.adapt_source = {
                "text": r["text"],
                "project": r["project"],
                "genre": r["genre"],
                "mode": "recommend_genre",
            }
            st.switch_page("pages/3_각색.py")

    with col_act[3]:
        if st.button("💾 리뷰 결과 저장", use_container_width=True):
            review_text = f"# 다중 타겟 리뷰\n\n장르: {r['genre']['name']}\n타겟: {', '.join(t['name'] for t in r['targets'])}\n\n{r['review']}"
            meta = storage.save_version(
                f"{r['project']}_리뷰",
                review_text,
                metadata={"type": "review", "ai_score": r["ai_score"]},
                direction="다중 타겟 리뷰",
            )
            active_p = prof.get_active()
            if active_p:
                learning.increment_stat(active_p["name"], "total_reviews")
            st.success(f"✓ {r['project']}_리뷰 v{meta['version']} 저장 완료")

    # ========== 피드백 (학습 누적) ==========
    st.markdown("---")
    st.markdown("### 🧠 이 리뷰가 도움이 됐나요?")
    st.caption("좋았던/반려한 패턴을 누적하면 다음 작업부터 작가 스타일에 자동 반영됩니다.")

    active_profile = prof.get_active()
    if not active_profile:
        st.info("👤 [작가 프로필]을 먼저 등록·활성화하면 학습이 누적됩니다.")
    else:
        fb_col1, fb_col2 = st.columns(2)
        with fb_col1:
            st.markdown("#### 👍 좋았던 부분 (재현 권장)")
            loved_text = st.text_area(
                "어떤 표현/지점이 좋았나요?",
                key="fb_loved",
                height=80,
                placeholder="예) 캐릭터별 비유 체계가 일관됐다 / 첫 5분 후크가 강했다",
            )
            if st.button("👍 학습", key="fb_loved_btn", use_container_width=True):
                if loved_text.strip():
                    learning.add_lesson(
                        active_profile["name"],
                        "loved",
                        loved_text.strip(),
                        context={"project": r["project"], "genre": r["genre"]["code"]},
                    )
                    st.success("✓ 학습 누적됨")

        with fb_col2:
            st.markdown("#### 👎 반려한 부분 (회피 필수)")
            rejected_text = st.text_area(
                "어떤 표현/지점이 별로였나요?",
                key="fb_rejected",
                height=80,
                placeholder="예) 격언체 대사 / 너무 정제된 문어체 / 클리셰 결말",
            )
            if st.button("👎 학습", key="fb_rejected_btn", use_container_width=True):
                if rejected_text.strip():
                    learning.add_lesson(
                        active_profile["name"],
                        "rejected",
                        rejected_text.strip(),
                        context={"project": r["project"], "genre": r["genre"]["code"]},
                    )
                    st.success("✓ 학습 누적됨")


# ========== 장르별 추천 타겟 프리셋 ==========
def _get_target_presets(genre_letter: str) -> list[dict]:
    """장르별 추천 타겟 — 배급사 실무 기준"""
    common = [
        {"name": "20대 도시 트렌드 민감 여성", "age": "23~29", "lifestyle": "서울/수도권 도시", "preference": "감성+속도+SNS공유", "consumption": "OTT 구독·웹툰 결제·숏폼 일일"},
        {"name": "30대 직장인 여성", "age": "30~39", "lifestyle": "도시 직장인", "preference": "현실+위로+성장", "consumption": "주말 OTT·웹툰 미리보기"},
        {"name": "30대 직장인 남성", "age": "30~39", "lifestyle": "도시 직장인", "preference": "장르+긴장+세계관", "consumption": "OTT 시즌 정주행·게임"},
        {"name": "40~50대 가족 시청자", "age": "40~55", "lifestyle": "가족 동반 시청", "preference": "휴머니즘+안정+가족관계", "consumption": "공중파/케이블 본방·주말 영화"},
        {"name": "10대 청소년", "age": "13~19", "lifestyle": "학생", "preference": "캐릭터+로맨스+판타지", "consumption": "유튜브·웹툰·웹소설 무료구간"},
        {"name": "20대 남성 게이머", "age": "20~29", "lifestyle": "도시/지방", "preference": "액션+복수+성장", "consumption": "게임·웹소설·유튜브 해설"},
        {"name": "글로벌 한류팬 (영문권)", "age": "18~35", "lifestyle": "북미/유럽", "preference": "K-콘텐츠 특유의 감정", "consumption": "Netflix·Crunchyroll·라인망가"},
    ]

    # 장르별 가중치 — 가장 어울리는 타겟 위로
    if genre_letter == "C":  # 숏드라마
        return [common[1], common[3], common[6]]  # 30대女, 40~50대 가족, 글로벌
    if genre_letter == "F":  # 웹툰
        return [common[0], common[4], common[5]]  # 20대女, 10대, 20대 남성
    if genre_letter == "H":  # 웹소설
        return [common[5], common[1], common[4]]  # 20대 남성, 30대女, 10대
    if genre_letter == "A":  # 드라마
        return [common[1], common[3], common[0]]  # 30대女, 40~50대 가족, 20대女
    if genre_letter == "B":  # 영화
        return [common[2], common[3], common[6]]  # 30대男, 40~50대 가족, 글로벌
    if genre_letter == "L":  # 게임
        return [common[5], common[2], common[6]]  # 20대 남성, 30대男, 글로벌
    if genre_letter == "M":  # 예능
        return [common[1], common[3], common[0]]
    return common[:3]  # 기본


# 함수 정의를 위로 끌어올리지 못해서 — 호출 시점에 다시 정의 필요
# (Streamlit이 위에서 아래로 실행하므로 _get_target_presets는 Module 함수로)