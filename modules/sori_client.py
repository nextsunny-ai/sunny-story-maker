"""작가 에이전트 클라이언트 — 두 모드 자동 분기
1. Claude Code CLI (구독자용, API 키 X)
2. Anthropic SDK (API 키 보유자)

작가에게는 둘 다 동일한 인터페이스. 자동으로 가능한 쪽 사용."""

import os
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Iterator
from anthropic import Anthropic
from dotenv import load_dotenv

from modules import auth

load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "claude-opus-4-7")
SORI_SKILL_DIR = os.getenv("SORI_SKILL_DIR", "")


def _load_sori_skill() -> str:
    """소리 SKILL.md 본문 로드 — README + chapters."""
    parts = []
    if not SORI_SKILL_DIR:
        return _fallback_system_prompt()

    base = Path(SORI_SKILL_DIR)
    if not base.exists():
        return _fallback_system_prompt()

    readme = base / "README.md"
    if readme.exists():
        parts.append(f"# 소리(SORI) 페르소나\n\n{readme.read_text(encoding='utf-8')}")

    knowledge = base / "03_knowledge.md"
    if knowledge.exists():
        parts.append(f"\n\n# 작법 이론\n\n{knowledge.read_text(encoding='utf-8')}")

    workflow = base / "02_workflow.md"
    if workflow.exists():
        parts.append(f"\n\n# 작업 프로세스\n\n{workflow.read_text(encoding='utf-8')}")

    chapters = base / "chapters" / "00_장르매뉴얼_12종.md"
    if chapters.exists():
        parts.append(f"\n\n# 12장르 매뉴얼\n\n{chapters.read_text(encoding='utf-8')}")

    return "\n".join(parts) if parts else _fallback_system_prompt()


def _fallback_system_prompt() -> str:
    """SKILL.md 경로가 설정되지 않았을 때의 기본 프롬프트.
    사용자가 비어 있어도 진짜 작가처럼 동작하도록 핵심 노하우 모두 포함."""
    return """# 시나리오·대본 전문 작가 에이전트

너는 30년 경력 CD/감독의 눈을 통과할 시나리오만 쓰는 작가 에이전트다.
프로듀서 디렉터 수준 + humanizer 적용 + 한국 실무 표준 양식.

## 정체성
- McKee Story / Syd Field / Save the Cat 15비트 / Hero's Journey 작법 위에
- 박완서·황석영·김애란·한강의 한국어 문체를 더한다
- 한국 드라마 작가 김은희·박찬욱·봉준호의 화법을 참조

## 13개 지원 장르 (모두 한국 실무 표준 포맷)
A. TV드라마 / B. 영화 / C. 숏드라마 / D. 극장애니 / E. 애니시리즈
F. 웹툰 / G. 다큐 / H. 웹소설 / I. 뮤지컬 / J. 유튜브
K. 전시·체험 / L. 게임 / M. 예능

## ★ humanizer 6패턴 (모든 출력 자가 검증)
1. **번역투 "의" 이중**: "당신의 운명의 상대" → "운명의 상대"
2. **관료적 피동**: "결정되어졌다" → "결정했다" (능동)
3. **깔끔한 대구문**: "~것이 아닙니다. ~것입니다" → "~게 아니야. ~거야" (구어화)
4. **격언체 대사**: "인생은 ~다" 류 → 캐릭터 고유 비유로 (직업/취미 기반)
5. **관념어 대사 금지**: 존재증명·본질적·서사적·다층적·보편적 → 행동/감정으로
6. **메타포 과정리**: 깔끔한 대비 X. 불완전하게, 말이 끊기게.

## Tier 단어 시스템
- **Tier 1 (항상 교체)**: 패러다임, 혁신적, 역동적, 지속 가능한 솔루션, 완벽한 조화
- **Tier 2 (반복 시 교체)**: 본질적, 근본적, 다층적, 포괄적, 전략적
- **Tier 3 (밀도 높을 때)**: 일반 추상어 — 컨텍스트별 판단

## 한국 대사 룰
- 대사 숫자 = 한글 ("이십 년" / "스무 년" X / "20년" X)
- 캐릭터 화법 차별 — 이름 가리기 테스트 통과해야 함
- "당신" 남발 X → "오빠/언니/형/누나/이름" 호명
- 영어식 직설 X → 서브텍스트
- 표준어 일변도 X → 캐릭터 출신/직업/세대 따라 사투리·줄임말

## ★ 캐릭터 비유 체계 (필수 노하우)
주조연 캐릭터마다 직업/취미 기반 고유 비유 체계 부여:
- 야구 비유 / 커피 비유 / 건축 비유 / 보드게임 비유 / 의료 비유 등
- 격언체 대사 → 그 캐릭터의 비유로 교체
- 매 등장 시 그 캐릭터만의 입버릇/표현 1~2개

## 5단계 프로세스 (절대 순서)
1. 의뢰 분석 (장르·매체·분량·톤·타겟·마감·참조 자료 7항목)
2. 트리트먼트 (3~5줄: 1막·2막·3막 + 캐릭터 아크) — 사용자 검토
3. 시놉시스 (1쪽) — 사용자 검토
4. 시나리오 초안 (시퀀스/회차 분할)
5. humanizer 검증 + 자기 검수 → 보고

**룰**: 단계 건너뛰기 X. 사용자 검토 없이 다음 단계 X.

## 자기 검증 체크리스트 (모든 출력 전)
- [ ] humanizer 6패턴 통과
- [ ] 캐릭터 화법 차별 (이름 가리기 / 대사 교환 / 감정 변환 3테스트)
- [ ] 대사 숫자 한글 룰
- [ ] 장르 표준 포맷 (씬 헤딩 / 들여쓰기 / 분량)
- [ ] 30년 CD 통과 수준
- [ ] 2차 자가 감시: "이 글의 어떤 부분이 여전히 AI같은가?" 자문 → 재수정

## 작업 자세 (페르소나)
- 30년 CD 통과 수준만. 후진 산출·뻔한 답·추상 모드 X
- 친절한 전문가 — 친구 같은 따뜻함 + 자기 분야 단호한 자신감
- 자기 분야 깊이로 응답. 일반적인 답 X. 본인 노하우·근거 박힌 답
- 사용자 시간 = 매우 귀하다. 미사여구·아부·자기평가 X. 정보·결과·다음 단계만
- 글쓰기 자체는 단독 책임 (다른 영역으로 떠넘기기 X)

## 절대 금지
- 클리셰 대사 ("나는 너를 위해…" 류) 직역
- 한 씬에 두 가지 메인 임무 동시 (집중 분산)
- IP 홀더 협의 없이 "확정" 톤 발언
- 추측을 사실처럼 (예: "이 작품 Netflix 픽업 가능성")
- 작품 인용 시 출처 검증 X면 인용 X
- "초고 완성" — 실제 파일 경로 또는 "착수 안 됨"으로

이 노하우는 사용자가 자기 SKILL.md를 별도로 연결하지 않아도 모든 작업에 항상 적용된다."""


_CACHED_SYSTEM = None


def get_system_prompt() -> str:
    global _CACHED_SYSTEM
    if _CACHED_SYSTEM is None:
        _CACHED_SYSTEM = _load_sori_skill()
    return _CACHED_SYSTEM


def is_configured() -> bool:
    """작가가 사용 가능한 상태인지 (auth 모듈 위임)"""
    return auth.is_ready()


def _build_full_system() -> str:
    """기본 SKILL + 활성 프로필 + 누적 학습을 합쳐 system prompt 구성"""
    parts = [get_system_prompt()]

    # 활성 프로필이 있으면 컨텍스트로 추가 (지연 import 순환 회피)
    try:
        from modules import profile as prof
        from modules import learning
        active = prof.get_active()
        if active:
            ctx = prof.build_profile_context(active)
            if ctx:
                parts.append("\n\n" + ctx)
            lessons_ctx = learning.build_lessons_context(active.get("name", ""))
            if lessons_ctx:
                parts.append("\n\n" + lessons_ctx)
    except (ImportError, Exception):
        pass

    return "\n".join(parts)


def call_sori(user_prompt: str, max_tokens: int = 4096, temperature: float = 0.7, model: str = None) -> str:
    """프롬프트 보내고 응답 받음. 인증 모드 자동 분기.
    model: 명시 시 해당 모델 사용 (예: 'claude-haiku-4-5' 빠른 응답용). 미지정 시 DEFAULT_MODEL.
    """
    mode = auth.get_auth_mode()
    if mode == "none":
        return _mock_response(user_prompt)
    if mode == "claude_code":
        return _call_via_claude_code(user_prompt, max_tokens=max_tokens)
    return _call_via_sdk(user_prompt, max_tokens=max_tokens, temperature=temperature, model=model)


def stream_sori(user_prompt: str, max_tokens: int = 4096, temperature: float = 0.7, model: str = None) -> Iterator[str]:
    """스트리밍 응답.
    model: 명시 시 해당 모델 사용 (예: 'claude-haiku-4-5' 빠른 채팅용). 미지정 시 DEFAULT_MODEL.
    """
    mode = auth.get_auth_mode()
    if mode == "none":
        for chunk in _mock_response(user_prompt).split():
            yield chunk + " "
        return
    if mode == "claude_code":
        # CLI는 진정한 스트리밍 어렵 — 한번에 받아서 청크로 분할
        full = _call_via_claude_code(user_prompt, max_tokens=max_tokens)
        buf = ""
        for ch in full:
            buf += ch
            if len(buf) >= 8 or ch in "\n.!?,":
                yield buf
                buf = ""
        if buf:
            yield buf
        return

    # SDK 스트리밍
    client = Anthropic(api_key=API_KEY)
    system = _build_full_system()
    with client.messages.stream(
        model=model or DEFAULT_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def _call_via_sdk(user_prompt: str, max_tokens: int, temperature: float, model: str = None) -> str:
    """Anthropic SDK 직접 호출 (API 키)"""
    client = Anthropic(api_key=API_KEY)
    system = _build_full_system()

    response = client.messages.create(
        model=model or DEFAULT_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


def _call_via_claude_code(user_prompt: str, max_tokens: int = 4096) -> str:
    """Claude Code CLI 서브프로세스 호출 (Pro/Max 구독자, API 키 X)
    Windows의 .cmd/.ps1 모두 지원."""
    system = _build_full_system()
    full_prompt = f"{system}\n\n---\n\n{user_prompt}"

    exe = auth._find_claude_executable()
    if not exe:
        return "[오류] Claude 앱이 감지되지 않습니다. https://claude.ai/download 에서 설치 후 로그인하세요."

    try:
        # 실행 파일 종류에 따라 args 구성
        if exe.endswith(".ps1"):
            args = ["powershell", "-NoProfile", "-NonInteractive",
                    "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
                    "-File", exe, "-p"]
        elif exe.endswith((".cmd", ".bat")):
            args = [exe, "-p"]
        else:
            args = [exe, "-p"]

        # Windows 콘솔 창 깜빡임 방지
        kwargs = {}
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = subprocess.SW_HIDE
            kwargs["startupinfo"] = si

        result = subprocess.run(
            args,
            input=full_prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
            shell=False,
            **kwargs,
        )
        if result.returncode != 0:
            err = result.stderr.strip() or result.stdout.strip() or "Claude Code 실행 실패"
            return f"[오류] {err[:500]}\n\n[설정] 페이지에서 인증 상태를 확인하거나, Anthropic API 키를 직접 입력하세요."
        out = result.stdout.strip()
        if not out:
            return "[오류] 빈 응답. Claude 앱이 로그인되어 있는지 확인하세요."
        return out
    except subprocess.TimeoutExpired:
        return "[오류] 응답 시간 초과 (5분). 짧게 다시 시도해주세요."
    except FileNotFoundError as e:
        return f"[오류] 실행 파일 호출 실패: {e}"
    except Exception as e:
        return f"[오류] {e}"


def _mock_response(user_prompt: str) -> str:
    """API 키 없을 때 — 동작 확인용 모의 응답"""
    return f"""[모의 응답 — ANTHROPIC_API_KEY 미설정]

받은 프롬프트:
{user_prompt[:500]}{'...' if len(user_prompt) > 500 else ''}

실제 동작을 위해 .env 파일에 ANTHROPIC_API_KEY를 설정하세요.
설정 페이지에서 직접 입력 가능합니다.
"""


# ============ 모드별 프롬프트 빌더 ============

def build_ai_pitch_prompt(idea: str, genre: dict, workflow: dict) -> str:
    """AI 기획 모드 — 한 줄 아이디어 → 풀 트리트먼트"""
    return f"""# 작업 요청: AI 기획 모드 (Magic Pitch)

## 입력
**한 줄 아이디어**: {idea}

## 대상 장르
- 장르: {genre['name']} ({genre['subtitle']})
- 분량 표준: {genre['분량_표준']}
- 핵심 양식: {genre['포맷']}
- 주요 전략: {' / '.join(genre['핵심_전략'][:3])}

## 단계별 출력 요청
한 줄 아이디어로부터 다음을 순서대로 작성해줘:

1. **로그라인** (1줄, 영화 제작자가 1초 안에 판단할 수 있는)
2. **트리트먼트** (3~5줄, 1막·2막·3막 핵심 + 캐릭터 아크)
3. **선결정 사항** ({', '.join([f['label'] for f in workflow['fields'][:5]])} 각각 추천 안)
4. **시놉시스** (1쪽, 한국어 자연스러움 우선)
5. **씬/회차/컷 구성** (해당 장르 양식대로 첫 부분 샘플)

## 룰 (★)
- 30년 CD 통과 수준
- humanizer 자가 검증 (번역투/격언체/관념어/rule-of-three/대구문 회피)
- 캐릭터 화법 차별화
- 한국어 자연스러움 우선

## 형식
각 단계마다 ## 헤더로 구분. 마지막에 "다음 단계 추천" 1줄.
"""


def build_collaborate_prompt(stage: str, user_input: dict, genre: dict, workflow: dict, prior: dict = None) -> str:
    """공동 집필 모드 — 단계별 진행"""
    prior_str = ""
    if prior:
        prior_str = "\n\n## 이전 단계 결과\n" + "\n\n".join([f"### {k}\n{v}" for k, v in prior.items()])

    return f"""# 작업 요청: 공동 집필 모드 — {stage} 단계

## 사용자 입력
{chr(10).join([f"- **{k}**: {v}" for k, v in user_input.items() if v])}

## 장르
{genre['name']} ({genre['subtitle']}) — {genre['분량_표준']}
{prior_str}

## 이번 단계 ({stage}) 출력 룰
- 단계만 작업 (다음 단계 미리 X)
- humanizer 적용 — AI투 0%
- 캐릭터 화법 차별 + 한국어 자연
- 사용자가 검토 후 OK해야 다음 단계로 (네가 다음 단계 작업 X)

작업해줘."""


def build_review_prompt(text: str, genre: dict = None) -> str:
    """평가 모드 — 시나리오 첨부 → 분석 리포트"""
    genre_part = ""
    if genre:
        genre_part = f"\n## 장르 컨텍스트\n{genre['name']} ({genre['subtitle']}) — 표준: {genre['분량_표준']}\n실패 요인: {', '.join(genre['실패요인'])}"

    return f"""# 작업 요청: 평가 모드 (Review)

## 분석 대상 시나리오
```
{text[:8000]}{'...(이하 생략)' if len(text) > 8000 else ''}
```
{genre_part}

## 출력 룰
다음 항목으로 분석 리포트 작성:

### 1. 종합 점수 (100점 만점)
- 구조: __/25
- 캐릭터: __/25
- 대사: __/25
- 포맷: __/25
- **총점: __/100**

### 2. 장르 자동 식별
양식·분량·키워드 분석 → 12개 장르 중 하나로 분류 + 근거

### 3. 구조 진단
- 3막/5막/기승전결 적합성
- Plot Point 위치 / Midpoint / 중반 처짐

### 4. 캐릭터 일관성
- 이름 가리기 테스트
- 대사 교환 테스트
- 감정 변환 테스트

### 5. AI투 검출 (humanizer 6패턴)
- 번역투 / 관료적 피동 / 격언체 / 관념어 / 깔끔한 대구문 / 메타포 과정리
- 발견 시 원문 인용 + 수정 제안

### 6. 장르 표준 부합
- 분량/페이지/포맷이 한국 실무 표준에 맞는가
- 장르별 실패 요인 체크

### 7. 구체적 개선 제안 (Top 5)
- 우선순위 높은 5가지

### 8. 강점 (살릴 부분)
- 그대로 유지해야 할 좋은 부분 3가지

### 9. 같은 매체 내 각색 디렉션 (★ 기본 추천)
이 작품을 같은 매체 안에서 더 강하게 만들 수정 방향 5가지:

1. **(예: S#3 무게 더하기)** — 어떤 씬/회차에서 무엇을 어떻게 강하게 / 줄이기
2. ...
3. ...
4. ...
5. ...

각 디렉션은 작가가 [수정 디렉션 입력]에 그대로 복붙해 사용할 수 있도록 구체적으로.

### 10. 다른 매체 변환 추천 (선택 옵션 — 사용자가 요청한 경우만)
별도 요청 시에만 출력. 기본은 9번에서 끝.
- "다른 매체로도 가능성 보고 싶음" 같이 사용자가 명시적으로 물었을 때만 응답.
- 그 외에는 "다른 매체 변환 원하시면 말씀하세요" 1줄로 갈음.

### 11. 다음 단계
"같은 매체 안에서 [디렉션 1번]부터 시작하시면 좋겠음" 같이 작가가 다음 행동을 바로 할 수 있게 안내.

## 룰
- 솔직하게. 후하게 채점하지 마.
- 30년 CD 기준.
- 출처(원문 인용) 명시.
"""


def build_adapt_prompt(text: str, source_genre: dict, target_genre: dict, target_workflow: dict) -> str:
    """각색 모드 — 다른 매체로 변환"""
    return f"""# 작업 요청: 각색 모드

## 원본
**원본 장르**: {source_genre['name']} ({source_genre['subtitle']})

원본 시나리오:
```
{text[:6000]}{'...(이하 생략)' if len(text) > 6000 else ''}
```

## 목표
**목표 장르**: {target_genre['name']} ({target_genre['subtitle']})
- 분량 표준: {target_genre['분량_표준']}
- 양식: {target_genre['포맷']}
- 핵심 전략: {' / '.join(target_genre['핵심_전략'][:3])}

## 변환 룰 (★ 절대 준수)
1. **원본의 좋은 부분 반드시 유지** — 약한 부분만 변경
2. 캐릭터 고유 비유 체계 유지 (있다면)
3. 캐릭터명 일관 (변경 시 명시)
4. 복선 대사 유지 (삭제 시 뒤 연결 끊기는지 확인)
5. 목표 장르 양식 정확히 적용 ({target_genre['씬_포맷']})

## 출력 단계
1. **각색 전략** — 무엇을 유지/추가/변경할지
2. **변환된 트리트먼트** (3~5줄)
3. **변환된 시놉시스** (1쪽)
4. **변환된 본문** (목표 장르 양식대로 첫 부분 샘플)
5. **변환 노트** — 무엇을 왜 바꿨는지 / 무엇을 보존했는지
"""


def build_targeted_review_prompt(
    text: str,
    targets: list[dict],
    genre: dict = None,
) -> str:
    """배급사 다중 타겟 리뷰 — 작가가 가장 궁금해하는 핵심 기능
    각 페르소나의 시선·말투·어휘로 별도 리뷰 생성 (3~5명 권장).
    핵심: 10대 리뷰가 할아버지 같으면 X. 진짜 그 사람이 쓴 것처럼."""
    genre_part = ""
    if genre:
        genre_part = f"\n## 매체/장르\n{genre['name']} ({genre['subtitle']})\n"

    # 페르소나 정보를 풍부하게 — 진짜 그 사람처럼 답하게
    targets_str_parts = []
    for i, t in enumerate(targets):
        block = f"""### 리뷰어 {i+1}: {t['name']}
- 연령: {t.get('age', '')}
- 성별: {t.get('gender', '')}
- 거주/직업: {t.get('lifestyle', '')}
- 취향/선호 콘텐츠: {t.get('preference', '')}
- 시청·소비 패턴: {t.get('consumption', '')}
- 좋아하는 패턴: {t.get('loves', '')}
- 싫어하는 패턴: {t.get('hates', '')}
- **말투/어휘 (★ 절대 준수)**: {t.get('voice_tone', '자연스러운 톤')}"""
        targets_str_parts.append(block)
    targets_str = "\n\n".join(targets_str_parts)

    return f"""# 작업 요청: 배급사 다중 타겟 리뷰

너는 30년 CD + 배급사 콘텐츠 평가 위원이다. 작가가 자기 작품이 다양한 타겟에게 어떻게 받아들여질지 가장 궁금해한다. 배급사처럼 타겟별로 별도 리뷰해라.

## 분석 대상
```
{text[:7000]}{'...(이하 생략)' if len(text) > 7000 else ''}
```
{genre_part}
## 타겟 ({len(targets)}개)
{targets_str}

## 출력 형식 — 알바 리서치 문항지 (배급사 표준 양식)

**작가들이 받아본 적 있는 그 양식 그대로**. 각 타겟이 알바 리서처라 가정하고 정형 문항에 답변. **타겟의 시각으로** 진짜 그 사람이 답한 것처럼.

### 타겟 1: {targets[0]['name']} 의 리뷰지

**Q1. 제목 평가** (1~10점)
- 점수 + 이유 (이 타겟이 보는 시각)
- 제목이 호기심을 끄는가 / 너무 흔한가 / 검색 노출 잘될까

**Q2. 제목 대안 추천 (3개)**
이 타겟이 더 끌릴 만한 제목 3개:
1. "(추천 제목 1)" — 이유
2. "(추천 제목 2)" — 이유
3. "(추천 제목 3)" — 이유

**Q3. 1차 반응 (첫 5분 / 첫 10페이지 / 첫 화)**
- 이 타겟이 처음 봤을 때의 반응 (구체적)
- "어 이거 뭐지?" / "지루해" / "오 이거 내 얘기네" 같은 톤

**Q4. 좋았던 부분 Top 3 (구체적 지점)**
1. "(원문 또는 씬 인용)" — 왜 좋았는지 (이 타겟이)
2. ...
3. ...

**Q5. 별로였던 부분 Top 3 (구체적 지점)**
1. "(원문 또는 씬 인용)" — 왜 거슬렸는지
2. ...
3. ...

**Q6. 캐릭터별 호감도** (각 메인 캐릭터마다 1~10점)
- 캐릭터A: __/10 — 이유
- 캐릭터B: __/10 — 이유
- ... (메인 3~5명)

**Q7. 대사 반응**
- 좋아할 대사 (원문 인용 2~3개)
- 거부감 드는 대사 (원문 인용 2~3개)
- "이런 표현은 우리 세대 안 씀" / "오 이 대사 좋다" 같은 구체

**Q8. 클라이맥스 임팩트** (1~10점)
- 이 타겟에게 클라이맥스가 와닿는가

**Q9. 결말 만족도** (1~10점)
- 이 타겟이 만족할 결말인가 / 무엇이 부족한가

**Q10. 고쳤으면 하는 부분 Top 5** (이 타겟에 한정)
1. (어느 씬/회차/대사)을 (어떻게)
2. ...
3. ...
4. ...
5. ...

**Q11. 다시 볼 의향 / 추천 의향** (1~10점)
- 이 타겟이 결제·시청·완주할 가능성
- 친구에게 추천할까

**Q12. 한 줄 평**
- 배급사 평가서에 들어갈 이 타겟의 한 줄

---

### 타겟 2: {targets[1]['name']} 의 리뷰지
(Q1~Q12 같은 형식)

---

### 타겟 3: {targets[2]['name'] if len(targets) > 2 else ''} 의 리뷰지
(Q1~Q12 같은 형식)

---

## 헐리우드 코버리지 표준 등급 (★ 추가)

타겟별 종합 평가 마지막에 헐리우드 배급사 표준 3등급으로 분류:

| 타겟 | 등급 | 근거 |
|------|------|------|
| 1 | PASS / CONSIDER / RECOMMEND | (이유 1줄) |
| 2 | PASS / CONSIDER / RECOMMEND | (이유 1줄) |
| 3 | PASS / CONSIDER / RECOMMEND | (이유 1줄) |

- **PASS**: 이 타겟에게는 진행 권장 X
- **CONSIDER**: 강점 있지만 큰 수정 필요
- **RECOMMEND**: 진행 가능

## 14개 평가 카테고리 점수 (헐리우드 표준)

각 카테고리 1~10점. 종합 평가 추가 정보:
- 컨셉 / 캐릭터 / 스토리 / 플롯·구조 / 씬 / 주제 / 장르 / 페이싱 / 톤 / 대사 / 시장성 / 문체 / 포맷·문법 / 제목

## 마지막 — 종합 분석

### 타겟 매칭도 매트릭스
| 타겟 | 1차반응 | 몰입도 | 구매의향 | 종합 |
|------|---------|-------|---------|-----|
| 1 | | /10 | /10 | /10 |
| 2 | | /10 | /10 | /10 |
| 3 | | /10 | /10 | /10 |

### 핵심 인사이트
1. **가장 잘 맞는 타겟**: (이유)
2. **가장 약한 타겟**: (이유 + 잡으려면)
3. **타겟 간 충돌**: (한 타겟에 맞추면 다른 타겟이 빠질 부분)

### 배급/유통 추천
- 어느 플랫폼/채널이 가장 적합한지 (이 타겟 분포 기준)

## 룰 (★ 절대 준수)

### 1. 그 세대의 '시각'으로 작품을 평가 (가장 중요)

**어투는 부차적. 핵심은 그 페르소나가 진짜 자기 인생/가치관/관심사로 이 작품을 어떻게 보는가다.**

각 리뷰어가 작품을 평가할 때:
- **자기 인생 단계의 고민**으로 본다 (10대는 학원·진로·로맨스 / 30대는 결혼·커리어·현실 / 50대는 자녀·노후·인생 회고)
- **자기 시대의 가치관**으로 본다 (10대는 다양성·평등 민감 / 50대는 정통·예의 중시)
- **자기가 살아온 콘텐츠 경험**으로 비교 (10대는 최근 K-드라마/웹툰 / 50대는 90년대 명작)
- **자기 일상의 결**로 디테일 잡는다 (워킹맘은 가족 장면 디테일 / 게이머는 액션 합)

예시 — 같은 씬을 다른 시각으로:
> 주인공이 어머니에게 거짓말하는 장면

- **10대 여학생**: "엄마한테 거짓말하는 게 너무 가벼워 보여. 우리 세대는 이거 이렇게 안 함. 부모 세대 작가가 쓴 거 같아."
- **30대 워킹맘**: "엄마 입장에서 이 거짓말 알면 진짜 무너지는 디테일이 빠져 있어. 작가가 부모 시점은 안 살아봤구나 싶음."
- **50대 어머니**: "거짓말은 누구나 해. 근데 결국 이 모녀가 화해하는 그림이 보여야 시청자가 따라오지. 지금 결말이 너무 차가워."
- **20대 평론가**: "이 거짓말 씬의 서브텍스트가 약함. 1막 복선 회수도 안 됨."

### 2. 평가 = 진짜 분석 (감상문 X)
"좋았어요/별로예요" 식 단순 인상 X. 그 시각으로:
- **어떤 캐릭터에 자기 인생을 투영하는지**
- **어떤 씬에서 진짜 빠지고 어디서 떨어지는지** (구체 위치)
- **어떤 대사가 자기 세대 안 씀 / 자기 세대 쓰는데 잘 살림**
- **결말이 자기 세대에게 의미 있는지**

### 3. 어투는 모두 정중한 표준 평가서 (★)
**리뷰는 평가서다. 10대라고 "ㅋㅋ" 같은 줄임말로 쓰지 X.** 60대라고 권위적으로 훈계하지도 X.
모든 리뷰어가 동일하게 **정중하고 표준적인 한국어 평가서 톤**으로 작성한다.

**차별점은 어투가 아니라 오직 '분석 시각'**:
- 무엇을 잡아내는가
- 무엇과 비교하는가
- 어떤 디테일에 반응하는가
- 어떤 가치관으로 보는가
- 자기 인생 어떤 단계의 경험을 투영하는가

→ 결과적으로 같은 씬을 봐도 10대와 50대가 잡아내는 부분이 완전히 다르지만, **글 자체는 둘 다 진지한 평가서**.

### 4. 평가 자체의 룰
- 추상적 평가 X — "S#3 회의실 장면, 이 부분에서 빠진다" 식 구체
- 원문 인용 (대사·씬) 필수
- 30년 CD 통과 수준 — 솔직, 후하지 X
- humanizer 6패턴 (리뷰 문장도 AI투 X)
- 작가가 이 리뷰 받고 어디를 어떻게 고칠지 바로 알 수 있게

### 5. 페르소나끼리 시각이 뭉개지면 X
타겟 1과 2의 평가가 비슷한 시각/디테일이면 실패. 각자 자기 인생에서만 보이는 디테일을 잡아내야 함.
"""


def build_revise_prompt(
    text: str,
    direction: str,
    genre: dict,
    target_section: str = "전체",
    version_number: int = 2,
) -> str:
    """같은 매체 내 각색 — 수정 디렉션 받아서 부분/전체 수정
    실무에서 무한 반복 사용 가능하도록 부분 수정 + 디렉션 기반."""
    return f"""# 작업 요청: 같은 매체 내 각색 — v{version_number}

## 장르
{genre['name']} ({genre['subtitle']})

## 수정 대상
{target_section}

## 작가 디렉션 (수정 방향)
{direction}

## 원본 (이전 버전)
```
{text[:7000]}{'...(이하 생략)' if len(text) > 7000 else ''}
```

## 수정 룰 (★ 절대 준수)
1. **원본의 좋은 부분 반드시 유지** — 디렉션이 가리키는 부분만 수정
2. 디렉션이 없는 부분은 손대지 말 것 (작가가 의도한 부분일 수 있음)
3. 캐릭터 고유 비유 체계 유지
4. 캐릭터명/관계 일관성 유지
5. 복선 대사 유지 (삭제 시 뒤 연결 끊기는지 확인)
6. humanizer 적용 (AI투 제거)
7. 장르 양식 유지 ({genre['씬_포맷']})

## 출력 형식
1. **변경 요약 (Diff Notes)** — 무엇을 / 왜 / 어떻게 바꿨는지 (불릿 5~10개)
2. **수정된 본문** ({target_section} 부분, 또는 전체)
3. **유지한 부분** — 디렉션과 무관해서 그대로 둔 좋은 부분 3가지 명시
4. **다음 수정 제안 (선택)** — 작가가 다음 라운드에 뭘 하면 좋을지 1~2개 (강요 X)

작가는 이 결과를 받고 다시 디렉션 줘서 v{version_number+1}로 갈 수 있다. 무한 반복 가능한 베이스로 작성해줘.
"""


def build_genre_recommend_prompt(text: str, source_genre: dict) -> str:
    """다른 매체 변환 추천 — 사용자가 명시적으로 요청한 경우만 호출"""
    return f"""# 작업 요청: 다른 매체 변환 추천

## 원본
**원본 장르**: {source_genre['name']} ({source_genre['subtitle']})

원본:
```
{text[:5000]}{'...(이하 생략)' if len(text) > 5000 else ''}
```

## 출력 — 다른 매체 변환 Top 5
이 작품을 다른 매체로 변환했을 때 가장 좋을 5가지:

| 순위 | 추천 장르 | 이유 | 핵심 변환 포인트 | 난이도 |
|------|----------|------|----------------|------|
| 1 | | | | 하/중/상 |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

각 추천 후:
- **각색 매트릭스 룰** — 시점/시간축/깊이/체험 어떻게 분배할지
- **유지할 핵심 자산** — 원본의 어떤 부분이 그대로 살아남아야 하는지

## 룰
- 원본 분석 우선
- 단순 변환 X — 각 장르 고유 강점 살리기
- 사용자가 1~5 중 하나 선택하면 → 다음 단계는 build_adapt_prompt로
"""


# ============================================================
# 산출물 (Artifacts) 프롬프트 빌더 — 8종
# 각 산출물은 매체/장르/타겟/톤 등 작가 입력을 받아 별도 생성
# ============================================================

def _common_brief(idea: str, genre: dict, user_input: dict) -> str:
    """모든 산출물 빌더에 공통으로 들어가는 작품 정보 블록.
    영화/드라마면 심도 가이드 자동 첨부."""
    fields = "\n".join([f"- **{k}**: {v}" for k, v in (user_input or {}).items() if v])
    deep = _drama_movie_deep_addendum(genre, user_input)
    return f"""## 작품 기본 정보
- **아이디어**: {idea}
- **매체**: {genre['name']} ({genre['subtitle']})
- **분량 표준**: {genre.get('분량_표준', '')}
{fields}
{deep}"""


def build_logline_prompt(idea: str, genre: dict, user_input: dict = None) -> str:
    """로그라인 — 영화 제작자가 1초 안에 판단할 수 있는 1줄"""
    return f"""# 작업 요청: 로그라인 생성

{_common_brief(idea, genre, user_input)}

## 출력 형식
**로그라인 3안** — 작가가 고르거나 합칠 수 있게 3가지 변형:

### 안 1 (구조형)
"[누가] [어떤 상황에서] [무엇을] [왜] 한다"

### 안 2 (감정형)
캐릭터의 감정·결핍에 초점

### 안 3 (반전형)
훅이 강한 1줄 — 마지막에 반전

## 룰
- 각 안 1줄 이내
- 30년 CD가 1초 안에 판단 가능한 명료함
- humanizer 적용 (격언체/관념어 X)
- 매체에 맞는 톤 (영화는 시네마틱, 숏드라마는 강렬, 다큐는 질문형)
"""


def build_synopsis_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """시놉시스 — A4 1쪽"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1000]}" for k, v in prior.items()])

    return f"""# 작업 요청: 시놉시스 (A4 1쪽)

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식
**시놉시스 본문** (A4 1쪽 = 약 1,200자):

1. **시작 (Setup)** — 인물·세계 소개 (3~4줄)
2. **발단 (Inciting Incident)** — 사건 발생 (2~3줄)
3. **전개 (Plot Point 1 → Midpoint → Plot Point 2)** — 핵심 갈등 (4~6줄)
4. **절정·결말 (Climax → Resolution)** — 어떻게 끝나는가 (2~3줄)

## 룰
- 한국어 자연스러움 우선
- humanizer 6패턴 자가 검증
- "그것은 ~이었다" 같은 번역체 X
- 캐릭터의 결핍·아크 명확
- 시놉시스 자체가 곧 피칭 자료
"""


def _drama_movie_deep_addendum(genre: dict, user_input: dict = None) -> str:
    """영화·드라마 전용 심도 가이드 (Save the Cat 15비트 + 한국 실무 + 회차 구조)"""
    code = genre.get("code", "")
    if code not in ("drama", "movie"):
        return ""

    if code == "drama":
        episodes = (user_input or {}).get("episodes", "12부작")
        return f"""

## ★ TV 드라마 심도 가이드 (한국 실무 표준)

### 회차 수: {episodes}
회차별 미드포인트·턴 위치는 이 회차 수 기준으로 계산.

### 한국 드라마 작가 작법 — 김은희·박찬욱·김원석 패턴
- **A플롯·B플롯 병행**: A=메인 사건/관계, B=서브 캐릭터/일상. 매 회 둘 다 진전
- **회차 후크 (마지막 30초~1분)**: 다음 회 본방사수 결정. 강력한 클리프행어
- **8~12회 구간 처짐 방지** (코리안 드라마 고질병): 미드포인트 큰 반전 필수
- **대사가 곧 사건**: 한 줄 대사로 관계가 뒤집힌다 (정보 전달 X)
- **회차별 1화 후크**: 첫 5분 안에 시청자를 의자에 묶어두는 사건/대사

### Save the Cat 15비트 + 한국 드라마 회차 매핑
- Opening Image (1화 1분) → 일상의 평범
- Theme Stated (1화 5~10분) → 누군가 작품 주제를 흘림
- Setup → Catalyst (1~2화) → Inciting Incident
- Debate → Break Into Two (3화 끝) → Plot Point 1
- B Story (4화) → 서브 라인 시작
- Fun & Games (5~7화) → 약속의 즐거움
- Midpoint ({episodes} 중반) → 큰 반전 또는 가짜 승리
- Bad Guys Close In (중후반) → 모든 게 무너짐
- All Is Lost → Dark Night → Break Into Three (마지막 3~4화 전)
- Finale (마지막 회) → Final Image (Opening 대칭)

### 한국 드라마 대사 룰 (humanizer)
- "당신" 남발 X → "오빠/형/누나/이름" 호명
- 영어식 직설 X → 서브텍스트 ("그쪽이 좋다고 하면 어떻게 할 거예요?")
- 감정 설명 대사 X → 행동/소품/침묵
- 표준어 일변도 X → 캐릭터 출신/직업/세대 따라 사투리·줄임말
"""

    # movie
    runtime = (user_input or {}).get("runtime", "100분")
    return f"""

## ★ 영화 심도 가이드 (한국 영화 표준)

### 러닝타임: {runtime}
1페이지 = 1분 기준. 시퀀스 분할.

### 한국 영화 작가 작법 — 박찬욱·봉준호·김지운 패턴
- **첫 10분 = 영화의 운명**: 관객을 의자에 묶어두는 시간
- **절제**: 한 줄 대사·한 컷 장면이 무거워야 함. 라디오 드라마 X
- **오프닝 ↔ 클로징 이미지 대칭**: 관객 무의식 충족
- **미드포인트 (50~60분)**: 가장 큰 반전 또는 톤 전환
- **에필로그 씬**: 전체 메시지를 한 컷에 압축
- **대사보다 비주얼/소품/공간**이 더 많이 말한다
- **캐릭터 4~6명**: 너무 많으면 누구도 깊지 못함

### Save the Cat 15비트 — 영화 풀 적용
- Opening Image (~1분) → 일상의 평범
- Theme Stated (~5분) → 작품 주제 암시
- Setup (~12분) → 인물·세계 소개
- Catalyst (~12분) → Inciting Incident (사건 발생)
- Debate (~25분) → 주인공 망설임
- Break Into Two (~25분, 1막 끝) → 결심
- B Story (~30분) → 서브 캐릭터 등장
- Fun & Games (30~55분) → 약속의 즐거움
- Midpoint (~55분) → 가짜 승리 또는 가짜 패배
- Bad Guys Close In (55~75분) → 모든 게 무너지기 시작
- All Is Lost (~75분) → 밑바닥
- Dark Night of the Soul (75~85분) → 어둠
- Break Into Three (~85분) → 깨달음
- Finale (85~110분) → 클라이맥스
- Final Image (~110분) → Opening Image 대칭

### 영화 대사 룰 (humanizer)
- 격언체 X → 캐릭터 비유로
- 깔끔한 대구문 ("X가 아니라 Y야") X → 불완전한 문장
- 의도가 다 보이는 대사 X → 서브텍스트
- "OST를 위한 대사" X → 현실 대화처럼

### 한국 영화 시나리오 표준 양식
- 한글(.hwp) 또는 워드(.docx)
- 함초롬바탕 11pt, 줄간격 160%, 자간 100%
- 씬 헤딩: `S#1. 장소 / 시간` (한국식)
- 분량: A4 70페이지 (영진위 기준)
"""


def build_treatment_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """트리트먼트 — A4 3~5쪽 (시놉시스 확장)"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1500]}" for k, v in prior.items()])

    return f"""# 작업 요청: 트리트먼트 (A4 3~5쪽)

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식
**트리트먼트 본문** (A4 3~5쪽 = 약 4,000~6,500자):

장 단위로 구성. 각 장에 핵심 사건·감정·턴 명시.

### 1장 (Setup, 25%)
- 인물 소개 + 일상
- Inciting Incident (1막 끝)

### 2장 전반 (Confrontation 1, 25%)
- Plot Point 1 → 본격 갈등
- 중간 위기

### 2장 후반 (Confrontation 2, 25%)
- Midpoint 반전
- Plot Point 2 → 모든 게 무너짐

### 3장 (Resolution, 25%)
- Climax
- Resolution + Epilogue

## 룰
- 씬 헤딩 X (그건 대본 단계). 줄글로.
- 캐릭터 감정 흐름 명확
- 핵심 대사 1~2개 인용 가능
- humanizer 6패턴
"""


def build_characters_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """캐릭터 시트 — 메인 3~5명"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1500]}" for k, v in prior.items()])

    protagonist_count = (user_input or {}).get("protagonist_count", "1인 단독 (원톱)")

    return f"""# 작업 요청: 캐릭터 시트

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식

**메인 캐릭터 ({protagonist_count} 기준 + 적대자 + 핵심 조연 = 총 3~5명)** — 각 캐릭터마다:

### [캐릭터명] (나이·성별·직업)

**핵심 한 줄**: (이 캐릭터를 가장 잘 설명하는 한 줄)

**Want vs Need**:
- Want (표면 욕망):
- Need (진짜 필요):

**결핍 (Wound) → 거짓믿음 (Lie) → 결함 (Flaw)**:
- Wound: 과거 상처
- Lie: 그래서 믿게 된 거짓
- Flaw: 그게 만든 결함

**Backstory (3줄)**: 작가만 알아도 OK. 행동 일관성 만드는 배경

**비유 체계 (★ 이 캐릭터만의 직업/취미 기반)**:
- 예: 야구 비유 / 커피 비유 / 건축 비유 / 의료 비유

**입버릇 / 시그니처 표현 1~2개**

**캐릭터 아크**: (시작 → 끝 변화)

**관계 매트릭스**: 다른 메인 캐릭터와의 관계 한 줄씩

---

(다음 캐릭터 동일 형식)

## 룰
- 4분면 매트릭스 균형 (외향/내향 × 행동/사고)
- 캐릭터별 비유 체계 절대 겹치지 X
- humanizer 적용
- 이름 가리기 테스트 통과 가능한 화법 차별화
"""


def build_worldview_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """세계관 정리서"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1200]}" for k, v in prior.items()])

    era = (user_input or {}).get("era", "현대")
    space = (user_input or {}).get("space", "서울/수도권 도시")

    return f"""# 작업 요청: 세계관 정리서

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식

### 1. 시대·공간
- 시대: {era}
- 공간: {space}
- 시각적 톤 (의상/공간/색감 키워드)

### 2. 룰 (이 세계만의 규칙)
판타지·SF·사극이면 마법/기술/시대 룰. 현대물이면 사회 룰/직업 룰.
- 룰 1:
- 룰 2:
- 룰 3:

### 3. 시간대 / 연표 (해당 시)
주요 사건 연표 (작품 속 과거 포함)

### 4. 핵심 장소 5개
- 장소 1 (이름·설명·기능)
- 장소 2
- 장소 3
- 장소 4
- 장소 5

### 5. 사회 구조·계층·권력
누가 위에 있고 누가 아래 있는가

### 6. 작가 노트 (절대 작품에 안 나올 디테일)
- 작가만 알아도 OK인 배경 (행동/대사 일관성용)

## 룰
- 세계관은 작가팀·디자인팀이 공유하는 문서
- 번역체/관념어 X
- 시각적·구체적 묘사
"""


def build_episodes_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """회차 구성표 — 드라마/숏드라마/웹툰/웹소설/애니 시리즈만"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1500]}" for k, v in prior.items()])

    episodes = (user_input or {}).get("episodes") or (user_input or {}).get("total_episodes") or "12부"

    return f"""# 작업 요청: 회차 구성표

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식 (회차 수: {episodes})

### 시즌 아크 한 줄
시즌 전체를 관통하는 한 줄

### 회차별 구성 (모든 회차 — 각 1단락)

**EP01. [부제]**
- 핵심 사건:
- 시작 후크 (1분):
- 중간 턴:
- 엔딩 클리프행어:
- 캐릭터 진전:

**EP02. [부제]**
(동일 형식)

... 마지막 회까지

### 회차 분포 표 (개관)
| 회차 | 부제 | 주요 사건 | 캐릭터 진전 | 엔딩 톤 |
|------|------|----------|-----------|--------|
| EP01 | | | | |
| ... | | | | |

## 매체별 룰
- 드라마: 매 회 후크 + A/B플롯 / 미드포인트 반전
- 숏드라마: 매 회 클리프행어 / 페이월 5블록 의식
- 웹툰: 컷 단위는 X. 회차별 첫컷·엔딩컷 컨셉만
- 웹소설: 회당 5,000~5,500자 분량 의식
- 애니 시리즈: 시즌 아크 + 에피 소아크 이중

## humanizer 6패턴 적용
"""


def build_proposal_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None) -> str:
    """기획안 — 제작사/방송사/공모전 제출용"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:1500]}" for k, v in prior.items()])

    return f"""# 작업 요청: 기획안 (제출용)

{_common_brief(idea, genre, user_input)}
{prior_part}

## 출력 형식 — 한국 제작사·방송사 표준 기획안

### 1. 제목 + 가제 + 부제

### 2. 한 줄 정의 (로그라인)

### 3. 기획 의도
- 왜 이 시점에 이 작품인가
- 작가의 동기·문제의식
- 사회적 맥락 (있다면)
※ 자기자랑 X. 기획 중심·설득 톤.

### 4. 시장성 / 타겟
- 메인 타겟층
- 비교 작품 (벤치마크) 2~3편
- 차별점

### 5. 시놉시스 (요약 1쪽)

### 6. 캐릭터 (메인 3~4명 — 각 한 단락)

### 7. 톤 & 매너
- 비주얼 키워드 5개
- 음악·연출 방향

### 8. 분량·일정 (개략)
- 회차/러닝타임
- 제작 단계별 일정

### 9. 차별점 / 셀링 포인트 (핵심 3가지)

### 10. 제작 가능성 / 예산 감
- 캐스팅 후보 톤 (구체 이름 X — 분위기로)
- 제작 난이도

## 룰 (★ 절대)
- 자기자랑 / 자기평가 X
- 추측을 사실처럼 X (예: "Netflix 픽업 가능성")
- 수치 인용 시 출처 명시
- humanizer / 격언체 / 관념어 X
- 30년 CD 통과 수준의 설득력
"""


def build_script_prompt(idea: str, genre: dict, user_input: dict = None, prior: dict = None,
                       target_section: str = "EP01 첫 부분 샘플 (5~10페이지)") -> str:
    """대본 본문 — 매체 표준 양식대로"""
    prior_part = ""
    if prior:
        prior_part = "\n\n## 이미 작성된 자료\n" + "\n\n".join([f"### {k}\n{v[:2000]}" for k, v in prior.items()])

    return f"""# 작업 요청: 대본 본문 ({target_section})

{_common_brief(idea, genre, user_input)}
{prior_part}

## 매체 양식 (★ 정확히 준수)
{genre['name']} 한국 실무 표준 양식:
- 씬/컷 헤딩 형식: {genre.get('씬_포맷', '')}
- 분량 표준: {genre.get('분량_표준', '')}

## 출력
{target_section} — 매체 양식 그대로 출력.

## 룰
- 씬 헤딩 양식 정확히 (`S#1. 장소 / 시간` 또는 매체별)
- 캐릭터 화법 차별 (이름 가리기 테스트 통과)
- 대사 숫자 = 한글 ("이십 년" / "20년" X)
- 서브텍스트 활용 (직설 X)
- humanizer 6패턴 자가 검증
- 30년 CD 통과 수준
"""


def build_full_package_prompt(idea: str, genre: dict, user_input: dict, artifact_keys: list[str]) -> str:
    """기획 패키지 한 번에 — 여러 산출물을 순차로 만드는 마스터 프롬프트.
    실제로는 각 산출물 별도 호출 권장 (토큰/품질). 이 빌더는 미리보기용."""
    return f"""# 작업 요청: 기획 패키지

{_common_brief(idea, genre, user_input)}

## 만들 산출물 ({len(artifact_keys)}종)
{', '.join(artifact_keys)}

각 산출물은 별도 호출로 깊이 작업할 것. 이 호출은 패키지 개요만 출력해줘:
- 각 산출물 한 줄 요약 (이 작품의 그 산출물이 어떻게 나올지 미리보기)
- 작업 권장 순서
- 매체에 안 맞는 산출물 (예: 영화의 회차 구성표) 자동 제외 추천
"""


def build_osmu_prompt(idea: str, source_ip: str = "") -> str:
    """OSMU 모드 — 한 IP를 13장르 모두로"""
    ip_part = f"\n## 원본 IP\n{source_ip}\n" if source_ip else ""

    return f"""# 작업 요청: OSMU 풀세트 모드

## 핵심 아이디어
{idea}
{ip_part}

## 출력 — 13개 장르 매트릭스
각 장르마다 다음 형식으로 1~2단락:

### A. TV 드라마
- **차별 매력**:
- **시점/시간축/깊이**:
- **로그라인**:

### B. 영화
...

(M. 예능까지 13개)

## 룰 (★)
- 미디어별 다른 매력 분배 (영화=절제, 드라마=관계, 웹소설=내면, 게임=인터랙티브, 전시=공간)
- 단순 변환 X — 각 장르 고유 강점 살리기
- 한 IP 통일성 유지 (캐릭터/세계관 일관)
- 마지막에 **OSMU 전개 우선순위** (어디부터 시작하면 좋을지) 추천
"""
