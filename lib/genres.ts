/**
 * GENRES — 12개 장르 메타데이터 + 장르별 워크플로우
 * (사장님 design source data.jsx에서 변환 — 한 글자도 안 바꾸고 그대로)
 */

export interface GenreStep {
  n: number;
  name: string;
  short: string;
}

export interface Genre {
  letter: string;
  name: string;
  sub: string;
  format: string;
  pages: string;
  formatOptions: string[];
  standard: string;
  rhythm?: string;
  steps: GenreStep[];
}

export const GENRES: Genre[] = [
  {
    letter: "A", name: "TV 드라마", sub: "1~24부 / 단·미·장편",
    format: "한글(.hwp)", pages: "회당 30~35p",
    formatOptions: ["회당 30~35p", "회당 60~70p (단막)", "1~4부 (미니)", "16~24부 (장편)"],
    standard: "한국방송작가협회 .hwp",
    steps: [
      { n: 1, name: "로그라인", short: "로그라인" },
      { n: 2, name: "트리트먼트", short: "트리트먼트" },
      { n: 3, name: "시놉시스", short: "시놉시스" },
      { n: 4, name: "캐릭터 시트", short: "캐릭터" },
      { n: 5, name: "씬 리스트", short: "씬 리스트" },
      { n: 6, name: "대본", short: "대본" },
      { n: 7, name: "회차별 콘티", short: "콘티" },
    ],
  },
  {
    letter: "B", name: "영화", sub: "극장용 장편",
    format: "한글/워드", pages: "A4 70p (≈70분)",
    formatOptions: ["A4 70p (≈70분)", "A4 90p (≈90분)", "A4 110p (≈110분)", "단편 ~30p"],
    standard: "영화진흥위원회 표준 시나리오",
    steps: [
      { n: 1, name: "로그라인", short: "로그라인" },
      { n: 2, name: "트리트먼트", short: "트리트먼트" },
      { n: 3, name: "시퀀스 구조", short: "시퀀스" },
      { n: 4, name: "씬 헤더 · 슬러그라인", short: "슬러그" },
      { n: 5, name: "1막 시나리오", short: "1막" },
      { n: 6, name: "2막 시나리오", short: "2막" },
      { n: 7, name: "3막 시나리오", short: "3막" },
    ],
  },
  {
    letter: "C", name: "숏드라마", sub: "30~200화 숏폼",
    format: "워드(.docx)", pages: "1~2p / EP",
    formatOptions: ["1~2p / EP · 30화", "1~2p / EP · 60화", "1~2p / EP · 100화", "1~2p / EP · 200화"],
    standard: "OTT 숏폼 표준 .docx",
    steps: [
      { n: 1, name: "후킹 컨셉", short: "후킹" },
      { n: 2, name: "회차 구조", short: "구조" },
      { n: 3, name: "캐릭터 라인업", short: "캐릭터" },
      { n: 4, name: "에피소드 1~10", short: "EP 01-10" },
      { n: 5, name: "에피소드 11~30", short: "EP 11-30" },
      { n: 6, name: "클리프행어 맵", short: "클리프행어" },
    ],
  },
  {
    letter: "D", name: "극장 애니", sub: "장편 애니메이션",
    format: "워드 + 시트", pages: "70~90p",
    formatOptions: ["70p (단편 30분)", "90p (60분)", "120p (90분 장편)"],
    standard: "한국애니메이션산업협회 양식",
    steps: [
      { n: 1, name: "로그라인", short: "로그라인" },
      { n: 2, name: "월드빌딩", short: "월드" },
      { n: 3, name: "캐릭터 디자인 시트", short: "캐릭터" },
      { n: 4, name: "트리트먼트", short: "트리트먼트" },
      { n: 5, name: "시나리오", short: "시나리오" },
      { n: 6, name: "스토리보드 노트", short: "스토리보드" },
    ],
  },
  {
    letter: "F", name: "웹툰", sub: "회당 65~75컷",
    format: "텍스트 컷", pages: "50~100화+",
    formatOptions: ["50화 / 회당 65컷", "100화 / 회당 70컷", "200화+ / 회당 75컷"],
    standard: "한국만화가협회 콘티 양식",
    steps: [
      { n: 1, name: "로그라인", short: "로그라인" },
      { n: 2, name: "캐릭터 라인업", short: "캐릭터" },
      { n: 3, name: "회차 구성", short: "회차" },
      { n: 4, name: "1화 컷 콘티", short: "1화 콘티" },
      { n: 5, name: "에피소드 텍스트", short: "텍스트" },
      { n: 6, name: "컷 단위 분할", short: "컷 분할" },
    ],
  },
  {
    letter: "G", name: "다큐멘터리", sub: "방송·OTT",
    format: "한글 큐시트", pages: "45/60/90분",
    formatOptions: ["45분 1편", "60분 1편", "90분 1편", "60분 시리즈"],
    standard: "방송 다큐 큐시트 .hwp",
    steps: [
      { n: 1, name: "기획안", short: "기획" },
      { n: 2, name: "취재 구성안", short: "취재" },
      { n: 3, name: "촬영 큐시트", short: "큐시트" },
      { n: 4, name: "편집 구성", short: "편집" },
      { n: 5, name: "내레이션 원고", short: "내레이션" },
    ],
  },
  {
    letter: "H", name: "웹소설", sub: "장르 소설 200~500화",
    format: "한글/텍스트", pages: "5,000자/회",
    formatOptions: ["100화 / 5,000자", "200화 / 5,000자", "500화+ / 5,000자"],
    standard: "주요 플랫폼 표준 .txt",
    steps: [
      { n: 1, name: "로그라인 · 후킹", short: "후킹" },
      { n: 2, name: "세계관", short: "세계관" },
      { n: 3, name: "주조연 캐릭터", short: "캐릭터" },
      { n: 4, name: "1~10화 (기)", short: "기" },
      { n: 5, name: "11~50화 (승)", short: "승" },
      { n: 6, name: "51~150화 (전)", short: "전" },
      { n: 7, name: "151화~ (결)", short: "결" },
    ],
  },
  {
    letter: "I", name: "뮤지컬", sub: "공연 무대",
    format: "한글 + 악보", pages: "80~120p",
    formatOptions: ["80p (단막)", "100p (1막)", "120p (2막)"],
    standard: "한국뮤지컬협회 대본 양식",
    steps: [
      { n: 1, name: "로그라인", short: "로그라인" },
      { n: 2, name: "캐릭터 시트", short: "캐릭터" },
      { n: 3, name: "넘버 리스트", short: "넘버" },
      { n: 4, name: "1막 대본", short: "1막" },
      { n: 5, name: "2막 대본", short: "2막" },
      { n: 6, name: "가사 · 악보 노트", short: "가사" },
    ],
  },
  {
    letter: "J", name: "유튜브", sub: "쇼츠·미드폼·롱폼",
    format: "기획서", pages: "60s ~ 20m",
    formatOptions: ["쇼츠 60s", "미드폼 8~10m", "롱폼 15~20m"],
    standard: "유튜브 크리에이터 기획서",
    steps: [
      { n: 1, name: "타겟 · 컨셉", short: "컨셉" },
      { n: 2, name: "썸네일 · 후킹", short: "썸네일" },
      { n: 3, name: "스크립트", short: "스크립트" },
      { n: 4, name: "콘티 · 컷", short: "콘티" },
      { n: 5, name: "자막 · 캡션", short: "자막" },
    ],
  },
  {
    letter: "K", name: "전시", sub: "공간·체험형",
    format: "PPT + 평면도", pages: "관람 60~90분",
    formatOptions: ["관람 30~60분", "관람 60~90분", "관람 90~120분"],
    standard: "전시 기획안 .pptx",
    steps: [
      { n: 1, name: "전시 컨셉", short: "컨셉" },
      { n: 2, name: "관람 동선", short: "동선" },
      { n: 3, name: "섹션 구성", short: "섹션" },
      { n: 4, name: "월 텍스트 · 라벨", short: "월텍" },
      { n: 5, name: "도슨트 스크립트", short: "도슨트" },
    ],
  },
  {
    letter: "L", name: "게임", sub: "인터랙티브 시나리오",
    format: "엑셀 + 워드", pages: "30~100h",
    formatOptions: ["10시간 (인디)", "30시간 (스토리)", "100시간+ (RPG)"],
    standard: "게임 시나리오 엑셀 표준",
    steps: [
      { n: 1, name: "월드 바이블", short: "월드" },
      { n: 2, name: "메인 퀘스트", short: "메인" },
      { n: 3, name: "서브 퀘스트", short: "서브" },
      { n: 4, name: "NPC 대사 시트", short: "대사" },
      { n: 5, name: "분기 트리", short: "분기" },
      { n: 6, name: "엔딩 분기", short: "엔딩" },
    ],
  },
  {
    letter: "M", name: "예능", sub: "TV·웹 버라이어티",
    format: "큐시트", pages: "60~100분",
    formatOptions: ["60분 1회", "80분 1회", "100분 1회", "8회 시즌"],
    standard: "방송 예능 큐시트 .hwp",
    steps: [
      { n: 1, name: "포맷 기획", short: "포맷" },
      { n: 2, name: "출연자 매핑", short: "출연자" },
      { n: 3, name: "코너 구성", short: "코너" },
      { n: 4, name: "큐시트", short: "큐시트" },
      { n: 5, name: "자막 · 코멘트", short: "자막" },
    ],
  },
  {
    letter: "N", name: "연극", sub: "무대 · 1막·2막·다막극",
    format: "희곡", pages: "70~120분",
    formatOptions: ["1막극 (60~90분)", "2막극 (90~120분)", "다막극 (120분+)", "낭독극 (40~60분)"],
    standard: "한국 희곡 표준 (.hwp/.docx)",
    steps: [
      { n: 1, name: "공연 컨셉", short: "컨셉" },
      { n: 2, name: "등장인물·시놉시스", short: "인물" },
      { n: 3, name: "막·장 구성", short: "구성" },
      { n: 4, name: "희곡 본문", short: "본문" },
      { n: 5, name: "무대 지시·동선", short: "지시" },
    ],
  },
  {
    letter: "O", name: "소설", sub: "단편 · 중편 · 장편 (일반문학)",
    format: "산문체", pages: "200자 원고지 기준",
    formatOptions: ["콩트 (10매 이내)", "단편 (50~100매)", "중편 (200~400매)", "장편 (700매+)"],
    standard: "200자 원고지 / .hwp",
    steps: [
      { n: 1, name: "작품 기획", short: "기획" },
      { n: 2, name: "캐릭터·세계", short: "캐릭터" },
      { n: 3, name: "플롯", short: "플롯" },
      { n: 4, name: "본문 집필", short: "본문" },
      { n: 5, name: "퇴고·문장", short: "퇴고" },
    ],
  },
  {
    letter: "P", name: "에세이", sub: "산문 · 칼럼 · 일기",
    format: "산문 (자유 형식)", pages: "A4 기준",
    formatOptions: ["짧은 글 (1~3p)", "중편 에세이 (5~10p)", "에세이집 (책 한 권)", "칼럼 시리즈"],
    standard: "A4 산문 (.docx)",
    steps: [
      { n: 1, name: "주제·관점", short: "주제" },
      { n: 2, name: "구성·흐름", short: "구성" },
      { n: 3, name: "본문", short: "본문" },
      { n: 4, name: "퇴고·문장", short: "퇴고" },
    ],
  },
];

export function getGenre(letter: string): Genre | undefined {
  return GENRES.find((g) => g.letter === letter);
}
