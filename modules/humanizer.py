"""humanizer — AI투 검출 (소리 SKILL의 6패턴 + Tier 시스템)
기능: 텍스트 입력 → 패턴 매칭 → 위치+제안 리스트 반환"""

import re

# Tier 1 (절대 교체) — AI 어휘
TIER_1_WORDS = [
    "패러다임", "혁신적", "역동적", "지속 가능한 솔루션",
    "완벽한 조화", "이상적인 균형", "유기적인",
]

# Tier 2 (반복 시 교체) — 추상 명사
TIER_2_WORDS = [
    "본질적", "근본적", "다층적", "포괄적", "전략적",
    "체계적", "구조적", "총체적", "전반적",
]

# Tier 3 (밀도 높을 때) — 일반 추상어
TIER_3_WORDS = [
    "존재", "실재", "본연", "고유", "보편",
]

# 6 패턴 (소리 SKILL §humanizer)
PATTERNS = [
    {
        "name": "번역투 '의' 이중",
        "regex": r"(\S+의\s+\S+의\s+\S+)",
        "severity": "critical",
        "fix": "조사 '의'가 연속 2회 이상이면 줄여서 자연스럽게",
        "example": "당신의 운명의 상대 → 운명의 상대",
    },
    {
        "name": "관료적 피동",
        "regex": r"(되어졌|되어 있|발권되|이루어져|행해져|만들어져)",
        "severity": "high",
        "fix": "능동형으로",
        "example": "결정되어졌다 → 결정했다",
    },
    {
        "name": "깔끔한 대구문",
        "regex": r"(것이 아닙니다.{1,30}것입니다|것이 아니라.{1,30}것이다)",
        "severity": "high",
        "fix": "구어화. '~게 아니야. ~거야' 형태로",
        "example": "용기가 아닙니다. 두려움입니다 → 용기가 아니야. 두려움이야",
    },
    {
        "name": "격언체 결말",
        "regex": r"(결국 우리는 모두|진정한.*은\/는|사람은 누구나)",
        "severity": "high",
        "fix": "구체적 사실/캐릭터 비유로 교체",
        "example": "결국 우리는 모두 변한다 → 캐릭터 고유 비유 ('야구처럼...')",
    },
    {
        "name": "관념어 대사",
        "regex": r"(존재증명|본질적|서사적|다층적|보편적)",
        "severity": "critical",
        "fix": "구체적 행동/감정으로 대체",
        "example": "존재증명을 위해서야 → (행동으로) 그가 책상을 내리쳤다",
    },
    {
        "name": "rule-of-three 강박",
        "regex": r"(\S+,\s*\S+,\s*\S+\s*[—-]|\S+과\s+\S+과\s+\S+은)",
        "severity": "medium",
        "fix": "자연스러운 N개로",
        "example": "성장·발전·진화 → 성장",
    },
    {
        "name": "수동 영어식",
        "regex": r"(에 의해|에 의하여)",
        "severity": "medium",
        "fix": "능동으로",
        "example": "그에 의해 → 그가",
    },
    {
        "name": "대사 아라비아 숫자",
        "regex": r'"[^"]*\d+[^"]*"',
        "severity": "low",
        "fix": "대사는 한글 숫자로 (시나리오 양식)",
        "example": "20년 → 이십 년",
    },
    {
        "name": "고유어 기간 표현",
        "regex": r"(스무 년|서른 년|마흔 년)",
        "severity": "low",
        "fix": "한자어 숫자로",
        "example": "스무 년 → 이십 년",
    },
]


def detect(text: str) -> list[dict]:
    """텍스트에서 AI투 패턴 검출 → 위치/제안 리스트"""
    findings = []

    for pattern in PATTERNS:
        for m in re.finditer(pattern["regex"], text):
            findings.append({
                "pattern": pattern["name"],
                "severity": pattern["severity"],
                "match": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "fix": pattern["fix"],
                "example": pattern["example"],
            })

    # Tier 단어 검출
    for tier_num, words in [(1, TIER_1_WORDS), (2, TIER_2_WORDS), (3, TIER_3_WORDS)]:
        for word in words:
            for m in re.finditer(re.escape(word), text):
                findings.append({
                    "pattern": f"Tier {tier_num} 어휘 ({word})",
                    "severity": "critical" if tier_num == 1 else ("high" if tier_num == 2 else "medium"),
                    "match": m.group(0),
                    "start": m.start(),
                    "end": m.end(),
                    "fix": f"Tier {tier_num} 단어 — {'항상 교체' if tier_num == 1 else '반복 시 교체'}",
                    "example": f"{word} → 구체적 표현으로",
                })

    findings.sort(key=lambda x: x["start"])
    return findings


def severity_score(findings: list[dict]) -> int:
    """검출 결과 → AI투 점수 (0=깨끗, 100=AI 티 강함)"""
    if not findings:
        return 0
    weights = {"critical": 10, "high": 6, "medium": 3, "low": 1}
    total = sum(weights.get(f["severity"], 1) for f in findings)
    return min(100, total)


def highlight_html(text: str, findings: list[dict]) -> str:
    """검출된 부분을 HTML로 색깔 하이라이트"""
    if not findings:
        return _escape_html(text)

    findings_sorted = sorted(findings, key=lambda x: x["start"], reverse=True)
    result = text
    for f in findings_sorted:
        cls = "ai-highlight-critical" if f["severity"] in ("critical", "high") else "ai-highlight"
        before = _escape_html(result[:f["start"]])
        match = _escape_html(result[f["start"]:f["end"]])
        after = result[f["end"]:]
        title = f'{f["pattern"]} — {f["fix"]}'
        result = before + f'<span class="{cls}" title="{title}">{match}</span>' + after

    return result.replace("\n", "<br>")


def _escape_html(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def summary_by_pattern(findings: list[dict]) -> dict:
    """패턴별 발생 횟수 요약"""
    summary = {}
    for f in findings:
        summary[f["pattern"]] = summary.get(f["pattern"], 0) + 1
    return dict(sorted(summary.items(), key=lambda x: -x[1]))
