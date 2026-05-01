"""OSMU 모드 — 한 IP를 여러 매체로 어떻게 풀어갈지.
3단계 깊이: 매트릭스 분석 / 트리트먼트 / 풀 패키지.
분석 후 [→ 이 매체로 작업하기]로 집필·각색 모드로 이동."""

import streamlit as st
import time
from pathlib import Path
from modules.page_init import init_page
init_page("OSMU — SUNNY Story Maker")

from modules import sori_client, file_parser, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🌐</span>OSMU</div>
        <div class="app-header-version">한 IP → 여러 매체 분석/변환</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="page-intro">
    <strong>분석 + 매체별 변환</strong>
    한 IP를 어떤 매체로 풀어갈 때 어떻게 분배하면 좋을지 분석합니다.
    분석 후 [→ 이 매체로 작업하기]로 그 매체 집필/각색 모드로 이동.
    </div>
    """,
    unsafe_allow_html=True,
)


# ========== 1. 원본 입력 ==========
st.markdown("## 1. 원본 IP 입력")

upload_method = st.radio(
    "입력 방식",
    ["텍스트 직접", "파일 업로드 (.docx/.pdf/.txt)", "저장된 작품에서"],
    horizontal=True,
)

source_text = ""
project_default = ""

if upload_method.startswith("텍스트"):
    project_default = st.text_input(
        "작품명",
        value=st.session_state.get("osmu_project", ""),
        placeholder="예: 트랑로제_OSMU",
    )
    source_text = st.text_area(
        "핵심 아이디어 / 시놉시스 (자유롭게)",
        value=st.session_state.get("osmu_idea", ""),
        height=180,
        placeholder=(
            "예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수한다. "
            "처음엔 도시로 돌아갈 생각이었지만 마을 사람들과 엮이면서..."
        ),
    )

elif upload_method.startswith("파일"):
    uploaded = st.file_uploader(
        "원본 시나리오/시놉시스 파일",
        type=["docx", "pdf", "txt", "md", "fountain", "fdx"],
    )
    if uploaded:
        with st.spinner("파일 분석 중..."):
            source_text = file_parser.parse_uploaded_file(uploaded)
            project_default = Path(uploaded.name).stem
        st.success(f"✓ {uploaded.name} 로드 ({len(source_text):,}자)")
        with st.expander("내용 미리보기"):
            st.text(source_text[:1500] + ("..." if len(source_text) > 1500 else ""))

else:  # 저장된 작품
    projects = storage.list_projects()
    if projects:
        proj_names = [p["name"] for p in projects]
        chosen = st.selectbox("작품 선택", proj_names)
        versions = storage.list_versions(chosen)
        if versions:
            v_options = [f"v{v['version']} ({v['saved_at'][:10]})" for v in versions]
            v_choice = st.selectbox("버전", v_options)
            v_num = int(v_choice.split()[0][1:])
            source_text = storage.load_version(chosen, v_num)
            project_default = chosen
            st.success(f"✓ {chosen} v{v_num} 로드")
    else:
        st.info("저장된 작품이 없습니다.")

if source_text:
    project_name = st.text_input(
        "OSMU 프로젝트명 (저장용)",
        value=project_default or "",
        placeholder="예: 트랑로제_OSMU",
    )
else:
    project_name = ""


# ========== 2. 매체 선택 ==========
if source_text:
    st.markdown("## 2. 매체 선택")

    col_src, _ = st.columns([1, 1])
    with col_src:
        auto_letter = file_parser.estimate_genre(source_text)
        auto_idx = list(GENRES.keys()).index(auto_letter) if auto_letter in GENRES else 0
        source_choice = st.selectbox(
            "원본 매체 (자동 식별 — 수정 가능)",
            list_genre_names(),
            index=auto_idx,
            help="이 작품이 원래 어떤 매체였는지",
        )
        source_letter = parse_genre_choice(source_choice)

    st.markdown("**분석/변환할 매체** (체크 — 기본 12개 다, 원본 제외)")
    target_letters = []
    cb_cols = st.columns(4)
    for i, (letter, data) in enumerate(GENRES.items()):
        col = cb_cols[i % 4]
        with col:
            checked = st.checkbox(
                f"{letter}. {data['name']}",
                value=(letter != source_letter),
                key=f"osmu_t_{letter}",
            )
            if checked:
                target_letters.append(letter)


# ========== 3. 변환 깊이 ==========
if source_text and target_letters:
    st.markdown("## 3. 변환 깊이")

    depth = st.radio(
        "어디까지 만들지",
        [
            "A. 매트릭스 분석만 (각 매체 1단락 — 빠름 1~3분)",
            "B. 트리트먼트까지 (각 매체 A4 1쪽 — 매체당 1~2분)",
            "C. 풀 패키지 (각 매체 시놉+캐릭터+첫 부분 — 매체당 3~5분)",
        ],
        index=0,
    )
    depth_key = depth[0]  # 'A' / 'B' / 'C'

    n = len(target_letters)
    if depth_key == "A":
        eta = "1~3분"
    elif depth_key == "B":
        eta = f"{n*1}~{n*2}분 (매체 {n}개)"
    else:
        eta = f"{n*3}~{n*5}분 (매체 {n}개) — 무거움"

    st.caption(f"분석할 매체: **{n}개** · 깊이: **{depth_key}** · 예상: **{eta}**")


# ========== 4. 실행 ==========
if source_text and project_name and target_letters:
    st.markdown("## 4. 실행")

    if st.button(f"🌐 OSMU {depth_key} 시작", type="primary", use_container_width=True):
        idea_summary = source_text[:3000] if len(source_text) > 3000 else source_text
        target_names = [f"{l}. {GENRES[l]['name']}" for l in target_letters]

        # ============ A. 매트릭스 분석 ============
        if depth_key == "A":
            prompt = f"""# 작업 요청: OSMU 매트릭스 분석

## 원본
**원본 매체**: {GENRES[source_letter]['name']} ({GENRES[source_letter]['subtitle']})
**작품명**: {project_name}

원본:
```
{idea_summary}
```

## 분석할 매체 ({len(target_letters)}개)
{', '.join(target_names)}

## 출력 (각 매체마다)

### [매체 letter]. [매체 이름]

**🎯 차별 매력** (이 매체에서만 빛날 부분 한 줄)

**🎬 분배**:
- 시점: (1인칭/3인칭/다중 + 이유)
- 시간축: (압축/확장/병렬)
- 깊이: (내면/관계/세계관 어디 집중)
- 체험: (감상/체험/인터랙티브)

**📝 로그라인** (이 매체 변형)

**⚠ 주의점** (이 매체로 갈 때 빠뜨리지 말 것 / 빼야 할 것)

**난이도**: 하/중/상

---

## 마지막 — 우선순위 추천
"이 IP는 [A] → [B] → [C] 순서로 풀어가면 좋다" + 이유 한 단락

## 룰
- 각 매체 고유 강점 살리기
- 매체별 한국 실무 표준 의식
- humanizer 적용
"""
            start_ts = time.time()
            status_box = st.empty()
            timer_box = st.empty()
            result_box = st.empty()
            status_box.info(f"🌐 {len(target_letters)}개 매체 매트릭스 분석 중...")

            result = ""
            chunk_count = 0
            try:
                for chunk in sori_client.stream_sori(prompt, max_tokens=12000):
                    result += chunk
                    chunk_count += 1
                    result_box.markdown(result + " ▌")
                    if chunk_count % 5 == 0:
                        elapsed = int(time.time() - start_ts)
                        timer_box.caption(f"⏱ 경과 {elapsed}초 · 글자 {len(result):,}자")
            except Exception as e:
                result = f"[오류] {e}"

            elapsed_total = int(time.time() - start_ts)
            timer_box.caption(f"✓ 완료 · 총 {elapsed_total}초 · {len(result):,}자")
            status_box.success(f"✓ 매트릭스 분석 완료")
            result_box.empty()

            # 저장
            storage.save_artifact(
                project_name, "treatment", result,
                metadata={"type": "osmu_matrix", "source_letter": source_letter,
                          "targets": target_letters},
            )
            st.session_state.osmu_result = {
                "depth": "A",
                "project": project_name,
                "source_letter": source_letter,
                "target_letters": target_letters,
                "source_text": source_text,
                "matrix": result,
                "per_medium": {},
            }

        # ============ B. 트리트먼트 / C. 풀 패키지 ============
        else:
            per_medium = {}
            progress = st.progress(0)
            status = st.empty()

            for i, letter in enumerate(target_letters):
                target_genre = GENRES[letter]
                status.markdown(f"**{i+1}/{len(target_letters)}** · {target_genre['name']} 작업 중...")

                st.session_state.ssm_busy = {
                    "label": f"{target_genre['name']} 변환 중",
                    "detail": f"{i+1}/{len(target_letters)}",
                }
                if depth_key == "B":
                    # 트리트먼트만
                    prompt = sori_client.build_treatment_prompt(
                        idea_summary, target_genre,
                        user_input={"source_medium": GENRES[source_letter]['name']},
                        prior={"원본": idea_summary},
                    )
                    live = st.empty()
                    response = sori_client.stream_to_placeholder(prompt, live, max_tokens=6000)
                    per_medium[letter] = {"treatment": response}

                    storage.save_artifact(
                        f"{project_name}_{target_genre['name']}", "treatment", response,
                        metadata={"type": "osmu_treatment", "source": source_letter, "target": letter},
                    )

                else:  # C. 풀 패키지
                    package_results = {}
                    sub_status = st.empty()

                    # 시놉시스
                    sub_status.caption(f"  ↳ {target_genre['name']} 시놉시스...")
                    p_synopsis = sori_client.build_synopsis_prompt(
                        idea_summary, target_genre,
                        user_input={"source_medium": GENRES[source_letter]['name']},
                        prior={"원본": idea_summary},
                    )
                    syn_live = st.empty()
                    package_results["synopsis"] = sori_client.stream_to_placeholder(
                        p_synopsis, syn_live, max_tokens=3000
                    )

                    # 캐릭터
                    sub_status.caption(f"  ↳ {target_genre['name']} 캐릭터...")
                    p_chars = sori_client.build_characters_prompt(
                        idea_summary, target_genre,
                        prior={"시놉시스": package_results["synopsis"]},
                    )
                    char_live = st.empty()
                    package_results["characters"] = sori_client.stream_to_placeholder(
                        p_chars, char_live, max_tokens=5000
                    )

                    # 첫 부분 샘플
                    sub_status.caption(f"  ↳ {target_genre['name']} 첫 부분...")
                    p_script = sori_client.build_script_prompt(
                        idea_summary, target_genre,
                        prior={
                            "시놉시스": package_results["synopsis"],
                            "캐릭터": package_results["characters"],
                        },
                        target_section=f"{target_genre['name']} 첫 부분 샘플",
                    )
                    script_live = st.empty()
                    package_results["script"] = sori_client.stream_to_placeholder(
                        p_script, script_live, max_tokens=6000
                    )
                    sub_status.empty()

                    per_medium[letter] = package_results

                    # 매체별 작품 폴더에 저장
                    sub_proj = f"{project_name}_{target_genre['name']}"
                    for art_key in ("synopsis", "characters", "script"):
                        storage.save_artifact(
                            sub_proj, art_key, package_results[art_key],
                            metadata={"type": "osmu_package", "source": source_letter, "target": letter},
                        )

                progress.progress((i + 1) / len(target_letters))

            st.session_state.pop("ssm_busy", None)
            status.success(f"✓ {len(target_letters)}개 매체 변환 완료")

            st.session_state.osmu_result = {
                "depth": depth_key,
                "project": project_name,
                "source_letter": source_letter,
                "target_letters": target_letters,
                "source_text": source_text,
                "per_medium": per_medium,
            }


# ========== 5. 결과 + 매체별 작업 이동 버튼 ==========
if "osmu_result" in st.session_state:
    r = st.session_state.osmu_result
    st.markdown("---")
    st.markdown(f"## 📊 {r['project']} — OSMU {r['depth']}")

    if r["depth"] == "A":
        st.markdown(r.get("matrix", ""))
    else:
        # B / C — 매체별 탭
        tabs = st.tabs([f"{l}. {GENRES[l]['name']}" for l in r["target_letters"]])
        for tab, letter in zip(tabs, r["target_letters"]):
            with tab:
                if letter in r["per_medium"]:
                    pm = r["per_medium"][letter]
                    if r["depth"] == "B":
                        st.markdown(pm.get("treatment", ""))
                    else:  # C
                        for art_key, label in [("synopsis", "📄 시놉시스"),
                                               ("characters", "👥 캐릭터"),
                                               ("script", "🎬 첫 부분 샘플")]:
                            with st.expander(label, expanded=(art_key == "synopsis")):
                                st.markdown(pm.get(art_key, ""))

    # ★ 매체별 [→ 이 매체로 작업하기] 버튼
    st.markdown("---")
    st.markdown("## 🎬 마음에 드는 매체로 가서 작업")
    st.caption("매트릭스 / 트리트먼트 / 풀 패키지 본 후, 진짜로 풀어갈 매체 선택.")

    target_cols = st.columns(min(4, len(r["target_letters"])))
    for i, letter in enumerate(r["target_letters"]):
        col = target_cols[i % 4]
        data = GENRES[letter]
        with col:
            st.markdown(f"**{letter}. {data['name']}**")
            st.caption(data["subtitle"])

            is_same = (letter == r["source_letter"])
            if is_same:
                if st.button("✏️ 집필", key=f"go_w_{letter}", use_container_width=True):
                    st.session_state.prefilled_genre = letter
                    st.switch_page("pages/2_집필.py")
            else:
                if st.button("🔄 각색", key=f"go_a_{letter}", use_container_width=True):
                    st.session_state.adapt_source = {
                        "text": r["source_text"],
                        "project": r["project"],
                        "genre": GENRES[r["source_letter"]],
                        "mode": "specific_target",
                        "target_letter": letter,
                    }
                    st.switch_page("pages/3_각색.py")
