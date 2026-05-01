"""설정 — 작가 친화 친절 가이드"""

import streamlit as st
from pathlib import Path
from modules import auth

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">⚙️</span>설정</div>
        <div class="app-header-version">로그인 · 폴더 · 폰트</div>
    </div>
    """,
    unsafe_allow_html=True,
)

env_path = Path(__file__).parent.parent / ".env"


def read_env() -> dict:
    if not env_path.exists():
        return {}
    result = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def write_env(values: dict):
    lines = []
    for k, v in values.items():
        if v is not None:
            lines.append(f"{k}={v}")
    env_path.write_text("\n".join(lines), encoding="utf-8")


env = read_env()
status = auth.get_status_for_writer()

# ========== 1. 사용 가능 상태 ==========
st.markdown("## 1. AI 작가 연결 상태")

if status["ready"]:
    st.success(status["label"])
    st.caption(status["detail"])
    st.markdown(
        """
        <div style="background: var(--gradient-soft); padding: 14px 18px; border-radius: 10px; margin-top: 12px; font-size: 14px; color: #475569;">
        ✨ 추가 설정 없이 바로 사용하시면 됩니다. 메인 화면으로 돌아가서 장르 카드를 클릭하세요.
        </div>
        """,
        unsafe_allow_html=True,
    )
else:
    st.warning(status["label"])
    st.caption(status["detail"])

# ========== 2. AI 작가가 뭐고 어떻게 연결하나 (★ 작가용 친절 설명) ==========
st.markdown("---")
with st.expander("❓ AI 작가가 뭐고 어떻게 연결하나요?", expanded=not status["ready"]):
    st.markdown(
        """
        **AI 작가** = 이 프로그램이 사용하는 인공지능 작가.
        Claude(클로드)라는 AI를 안에서 부르고 있어요.

        Claude를 부르는 방법은 두 가지가 있습니다:

        ---

        ### 🟢 방법 1. Claude 앱으로 (★ 권장 — 작가에게 가장 쉬움)

        - [https://claude.ai](https://claude.ai) 에서 가입 + 월 $20 Pro 또는 Max 구독
        - **Claude Desktop 앱** 설치: [https://claude.ai/download](https://claude.ai/download)
        - 앱에 로그인해두면 → 우리 프로그램이 **자동으로 감지**해서 사용
        - 작가는 **아무 추가 설정 없음**

        **장점**: ChatGPT/Claude 쓰던 분들에게 익숙. 월 정액제라 비용 예측 가능.

        ---

        ### 🟡 방법 2. API 키 직접 입력 (개발자/고급)

        - [https://console.anthropic.com](https://console.anthropic.com) 에서 별도 가입 (Claude.ai 가입과 다름)
        - 결제수단 등록 → API 키 발급 (sk-ant-... 로 시작하는 긴 문자열)
        - 발급한 키를 아래 입력란에 붙여넣기
        - 사용량 단위로 청구 (작품 1편당 약 $0.5~$2)

        **언제 이걸 쓰나요?**
        - Claude 구독은 안 쓰지만 가끔만 시나리오 작업하실 때
        - 또는 회사에서 이미 Anthropic 계정이 있을 때
        - **잘 모르겠으면 → 방법 1을 쓰세요. 거의 모든 작가는 방법 1로 충분.**

        ---

        ### 둘 다 없으면?

        Claude.ai에서 무료 가입 → 한 달 정도 써보고 → Pro 구독으로 업그레이드.
        총 5분이면 끝납니다.
        """
    )

# ========== 3. 자체 키 (선택, 고급) ==========
st.markdown("---")
st.markdown("## 2. API 키 (방법 2 사용 시만)")
st.caption("방법 1로 사용하시는 분은 비워두세요. 방법 1이 자동으로 쓰입니다.")

api_key = st.text_input(
    "Anthropic API 키",
    value=env.get("ANTHROPIC_API_KEY", ""),
    type="password",
    placeholder="sk-ant-... (없으면 비워두세요)",
    help="Anthropic 콘솔에서 발급받은 API 키. 작가는 보통 비워둬도 됩니다.",
)

model = st.selectbox(
    "응답 품질",
    ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    index=0,
    format_func=lambda m: {
        "claude-opus-4-7": "최고 품질 (느리지만 가장 좋음 — 권장)",
        "claude-sonnet-4-6": "균형 (적당히 빠르고 좋음)",
        "claude-haiku-4-5-20251001": "빠른 속도 (간단한 작업용)",
    }.get(m, m),
    help="Opus = 시나리오용 권장. Haiku = 자잘한 캐릭터 이름 추천 같은 거에 쓰면 빨라요.",
)

# ========== 4. 작품 저장 위치 ==========
st.markdown("---")
st.markdown("## 3. 작품 저장 위치")
st.caption("기본은 이 프로그램 폴더 안 (output/). Drive/원드라이브와 자동 동기화하려면 그 폴더 경로 입력.")

drive_dir = st.text_input(
    "외부 동기화 폴더 (선택)",
    value=env.get("DRIVE_OUTPUT_DIR", ""),
    placeholder="예: G:/내 드라이브/내 작품 (비워두면 로컬만 저장)",
    help="Google Drive / OneDrive / Dropbox 폴더 경로를 넣으면 작품 저장 시 자동으로 백업됩니다.",
)

# ========== 5. 외부 노하우 폴더 (고급) ==========
st.markdown("---")
with st.expander("📚 고급 — 외부 노하우 폴더 (선택)"):
    st.markdown(
        """
        **이게 뭔가요?**
        본인이 직접 만든 작가 노하우 문서(SKILL.md)가 있다면, 그 폴더를 연결하면
        AI 작가가 작업할 때 그걸 참고합니다.

        **거의 모든 작가는 비워두시면 됩니다.** 비워두면 프로그램 내장 노하우
        (humanizer 6패턴, 13장르 매뉴얼, 한국 실무 양식 등)를 자동으로 사용합니다.
        """
    )
    sori_skill_dir = st.text_input(
        "노하우 폴더 경로",
        value=env.get("SORI_SKILL_DIR", ""),
        placeholder="(비워두면 내장 노하우 자동 사용)",
    )

# 저장
st.markdown("---")
if st.button("💾 설정 저장", type="primary", use_container_width=True):
    write_env({
        "ANTHROPIC_API_KEY": api_key,
        "DEFAULT_MODEL": model,
        "DRIVE_OUTPUT_DIR": drive_dir,
        "SORI_SKILL_DIR": sori_skill_dir,
    })
    st.success("✓ 저장 완료. 페이지 새로고침 시 적용됩니다.")

# ========== 폰트 안내 ==========
st.markdown("---")
st.markdown("## 4. 본문 폰트")
st.info(
    "메인 페이지 사이드바에서 본문 폰트 8종을 즉시 전환할 수 있습니다.\n\n"
    "**메뉴/UI 폰트**: Pretendard (변경 불가)\n"
    "**본문(대본 입력 영역)**: 함초롬바탕 / 나눔명조 / 본명조 / 마루부리 / "
    "KoPub바탕 / 고운바탕 / 나눔바른고딕 / 본고딕"
)

# ========== 디버그 ==========
with st.expander("🛠 진단 정보 (문제 있을 때만 보세요)"):
    st.code(f"""인증 모드: {auth.get_auth_mode()}
Claude 앱 감지: {auth.detect_claude_code()}
API 키 등록: {auth.has_api_key()}
저장 폴더: {drive_dir or '(로컬만)'}
노하우 폴더: {sori_skill_dir or '(내장 사용)'}""")
