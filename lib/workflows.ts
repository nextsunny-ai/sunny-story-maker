// 매체별 워크플로우 — V1 modules/workflows.py 그대로 TS 포팅
// 사장님 노하우 한 글자도 빼지 않음.
// 각 매체마다: steps(작업 단계) / fields(매체 전용 + 공통 입력) / export_format / output_files

export type FieldType = "text" | "textarea" | "select" | "multiselect" | "number";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  default?: string | number;
  min?: number;
  max?: number;
  help?: string;
}

export interface MediumWorkflow {
  letter: string;
  name: string;
  sub: string;
  steps: string[];
  fields: Field[];
  export_format: string;
  output_files: string[];
}

// ============================================================
// 공통 글쓰기 필드 — 매체 무관 본질 (장르/타겟/톤/주인공/시점/세계관/후크)
// ============================================================
export function commonWritingFields(opts?: { exclude?: string[]; extra?: Field[] }): Field[] {
  const exclude = opts?.exclude ?? [];
  const base: Field[] = [
    {
      key: "story_outline",
      label: "쓰고 싶은 내용 / 스토리 개요 (자유 메모)",
      type: "textarea",
      placeholder:
        "작품의 큰 줄거리 / 다루고 싶은 주제 / 인상적인 장면 / 결말 방향 / 영감 받은 작품 등 자유롭게.\n" +
        "예) 주인공이 어머니의 빚 때문에 야간 알바를 하다가 단골 손님의 일기장을 발견하면서 시작.\n" +
        "    중반에 그 손님이 사라지고 일기장의 내용이 점점 현실로 일어남.\n" +
        "    결말은 오픈으로 — 주인공이 일기를 계속 쓸지 말지 선택의 순간.",
    },
    {
      key: "tone",
      label: "톤 (타겟에 맞춰)",
      type: "select",
      options: ["다크", "밝은/유쾌", "시네마틱", "잔잔/일상적", "강렬/긴장", "감성/위로", "신랄/풍자", "혼합", "기타"],
    },
    {
      key: "protagonist_count",
      label: "주인공 구성",
      type: "select",
      options: [
        "1인 단독 (원톱)",
        "2인 듀오 (로맨스/버디)",
        "3인 트리오",
        "다수 앙상블 (4~6인)",
        "옴니버스 (회마다 다른 주인공)",
      ],
      default: "1인 단독 (원톱)",
    },
    {
      key: "pov",
      label: "시점",
      type: "select",
      options: [
        "1인칭",
        "3인칭 한정시점",
        "3인칭 전지적",
        "다중 시점 (캐릭터별 전환)",
        "관찰자 시점",
        "혼합 (장면별로 시점 바뀜)",
        "기타 (직접 입력)",
      ],
    },
    {
      key: "pov_custom",
      label: "↪ 직접 입력",
      type: "text",
      placeholder: "예) 1~3화는 1인칭, 4화부터 관찰자 시점",
    },
    {
      key: "protagonist",
      label: "주인공 한 줄 (이름 + 핵심 결핍)",
      type: "textarea",
      placeholder: "예) 강하은(28). 5년째 야간 카페 알바. 자기 이야기는 한 번도 써본 적 없음.",
    },
    {
      key: "antagonist",
      label: "적대자/장애물 한 줄 (없으면 비워두세요)",
      type: "textarea",
      placeholder: "예) 죽은 어머니가 남긴 빚. 또는 자기 안의 두려움.",
    },
    {
      key: "era",
      label: "시대 배경",
      type: "select",
      options: [
        "현대 (지금)",
        "근미래 (~2050)",
        "먼 미래/SF",
        "1990~2000년대 (레트로)",
        "1970~80년대",
        "근대 (1900~1950)",
        "일제강점기",
        "조선시대",
        "고려시대",
        "삼국시대",
        "신화/신선시대",
        "중세 유럽 풍",
        "가상 시대 (작가 설정)",
        "시간 무관/영원",
        "다중 시간대 (현대+과거 등)",
        "기타 (직접 입력)",
      ],
    },
    {
      key: "era_custom",
      label: "↪ 직접 입력",
      type: "text",
      placeholder: "예) 1세기 로마 / 2080년 화성",
    },
    {
      key: "space",
      label: "공간 배경 (대략)",
      type: "select",
      options: [
        "서울/수도권 도시",
        "지방 도시",
        "시골/농촌",
        "한국 전체 (이동 다)",
        "글로벌 (해외 위주)",
        "가상 세계/이세계",
        "우주/외계",
        "한정 공간 (학교/회사/병원 등)",
        "혼합",
        "미정",
        "기타 (직접 입력)",
      ],
    },
    {
      key: "space_custom",
      label: "↪ 직접 입력",
      type: "text",
      placeholder: "예) 부산 해운대 + 일본 큐슈",
    },
    {
      key: "structure",
      label: "구성 방식 (작법)",
      type: "select",
      options: [
        "기승전결 (한국·동양 표준)",
        "3막 구조 (Syd Field)",
        "5막 구조 (McKee)",
        "Hero's Journey (Joseph Campbell)",
        "Save the Cat 15비트 (Blake Snyder)",
        "옴니버스 (회마다 독립)",
        "프리스타일 (구조 자유)",
        "혼합",
        "미정 — AI 작가가 추천",
        "기타 (직접 입력)",
      ],
      default: "미정 — AI 작가가 추천",
    },
    {
      key: "structure_custom",
      label: "↪ 직접 입력",
      type: "text",
      placeholder: "예) 5+1 구조 / 비선형 액자식",
    },
    {
      key: "world_one_line",
      label: "세계관 한 줄 (특별한 룰/설정)",
      type: "textarea",
      placeholder: "예) 100년에 한 번 깨어나는 조선 요괴들이 SNS에 들킨다.",
    },
    {
      key: "first_hook",
      label: "첫 장면/컷 후크 (무엇으로 독자/시청자를 잡을지)",
      type: "textarea",
      placeholder: "예) 평범한 카페 알바생이 손님 컵 안에서 자기 시체를 발견한다.",
    },
  ];
  const filtered = exclude.length ? base.filter((f) => !exclude.includes(f.key)) : base;
  return opts?.extra ? [...filtered, ...opts.extra] : filtered;
}

// ============================================================
// 13개 매체별 워크플로우
// ============================================================
export const WORKFLOWS: Record<string, MediumWorkflow> = {
  A: {
    letter: "A",
    name: "TV 드라마",
    sub: "1~24부 / 단·미·장편",
    steps: ["의뢰 분석", "회차 구성", "트리트먼트", "시놉시스", "1화 씬 구성", "대본 초안", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "로맨스", "로맨틱코미디", "멜로", "시대극/사극", "판타지", "스릴러/미스터리",
          "법정/의학", "정치/시사", "가족/일상", "청춘/학원", "느와르/범죄", "코미디", "공포", "혼합",
        ],
      },
      {
        key: "episodes",
        label: "회차 수",
        type: "select",
        options: [
          "1부작 (단편/스페셜)", "2부작", "4부작", "6부작", "8부작", "10부작",
          "12부작", "14부작", "16부작", "20부작", "24부작", "기타 (직접 입력)",
        ],
        default: "12부작",
      },
      {
        key: "episodes_custom",
        label: "직접 입력 (위에서 '기타' 선택 시만)",
        type: "text",
        placeholder: "예: 8부작 / 시즌1 10화+시즌2 12화",
      },
      ...commonWritingFields(),
      {
        key: "ending_tone",
        label: "엔딩 의도 (자유, 미정 OK)",
        type: "select",
        options: ["해피", "오픈", "비극", "여운", "반전", "미정"],
      },
    ],
    export_format: "scene_dialogue",
    output_files: ["기획서.docx", "EP01.docx ~ EP{N}.docx"],
  },

  B: {
    letter: "B",
    name: "영화",
    sub: "극장용 장편",
    steps: ["의뢰 분석", "트리트먼트", "시놉시스", "시퀀스 분할", "대본 초안", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "드라마", "로맨스", "코미디", "스릴러/미스터리", "공포/호러", "액션", "느와르/범죄",
          "SF", "판타지", "사극/시대극", "다큐멘터리극", "전쟁", "음악/뮤지컬", "성장영화", "혼합",
        ],
      },
      {
        key: "runtime",
        label: "러닝타임",
        type: "select",
        options: ["단편 (~30분)", "중편 (30~60분)", "90분", "100분", "120분", "150분", "기타 (직접 입력)"],
      },
      { key: "runtime_custom", label: "직접 입력 (위에서 '기타' 선택 시만)", type: "text" },
      ...commonWritingFields(),
      {
        key: "rating_intent",
        label: "수위 의도 (글쓰기 자기검열 기준)",
        type: "select",
        options: ["전 연령", "12세", "15세", "청불 (수위 강함)", "미정"],
      },
      {
        key: "opening_closing",
        label: "오프닝 ↔ 클로징 이미지 대칭 컨셉 (있다면)",
        type: "textarea",
        placeholder: "예) 오프닝: 빈 카페 / 클로징: 가득 찬 카페",
      },
    ],
    export_format: "scene_dialogue",
    output_files: ["기.docx 승.docx 전.docx 결.docx", "시나리오_합본.docx", "시놉시스.docx", "캐릭터시트.docx"],
  },

  C: {
    letter: "C",
    name: "숏드라마",
    sub: "30~200화 숏폼",
    steps: ["의뢰 분석", "페이월 5블록 설계", "클리프행어 맵", "캐릭터 시트", "에피별 구성", "대사 초안", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "로맨스 판타지 (로판)", "복수극", "재벌물", "회귀물", "차원이동/이세계", "환생/빙의",
          "오피스 로맨스", "막장 가족", "복수+로맨스", "현대 판타지", "사극 판타지", "혼합",
        ],
      },
      {
        key: "total_episodes",
        label: "총 부작 수",
        type: "select",
        options: [
          "30화 (미니)", "40화", "50화", "60화", "70화", "80화", "90화", "100화", "120화",
          "150화", "200화 (장편)", "기타 (직접 입력)",
        ],
        default: "80화",
      },
      { key: "total_episodes_custom", label: "직접 입력 (위에서 '기타' 선택 시만)", type: "text" },
      ...commonWritingFields(),
      {
        key: "free_zone",
        label: "무료 구간 (몇 화까지 무료, 0=정함)",
        type: "number",
        min: 0,
        max: 30,
        default: 10,
      },
      {
        key: "paywall_bomb",
        label: "페이월 직후 폭탄 (있다면)",
        type: "textarea",
        placeholder: "결제한 사람이 '잘했다' 느낄 큰 반전. 미정이면 비워두세요.",
      },
      {
        key: "cliff_types",
        label: "클리프행어 유형 (5가지 번갈아)",
        type: "multiselect",
        options: ["정보형", "감정형", "위험형", "선택형", "시간 압박"],
      },
    ],
    export_format: "shortdrama_episode",
    output_files: ["시즌기획서.docx (5블록맵+클리프행어맵)", "EP001.docx ~ EP{N}.docx"],
  },

  D: {
    letter: "D",
    name: "극장 애니",
    sub: "장편 애니메이션",
    steps: ["의뢰 분석", "트리트먼트", "비주얼 컨셉", "시놉시스", "시퀀스 분할", "대본 초안", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "판타지", "모험", "성장", "SF", "코미디", "감동/드라마", "공포", "액션",
          "음악/뮤지컬", "사극/신화", "혼합",
        ],
      },
      {
        key: "target_age",
        label: "타겟 연령",
        type: "select",
        options: ["전 연령 (가족)", "어린이 (~10세)", "청소년 (10~17)", "성인 지향 (18+)"],
      },
      ...commonWritingFields(),
      {
        key: "why_anime",
        label: "왜 애니메이션이어야 하는가? (실사로 못 찍는 이유)",
        type: "textarea",
        placeholder: "예) 주인공이 색이 바뀌는 요괴라 실사 분장으로는 표현 불가",
      },
      {
        key: "climax_visual",
        label: "클라이맥스 비주얼 (셀링포인트, 글로 묘사)",
        type: "textarea",
      },
      {
        key: "music_concept",
        label: "음악 컨셉 (있다면)",
        type: "select",
        options: ["오리지널 OST", "기존곡 활용", "뮤지컬형 (캐릭터가 노래 부름)", "음악 최소", "미정"],
      },
    ],
    export_format: "anime_scene",
    output_files: ["시놉시스.docx", "캐릭터시트(디자인포함).docx", "시나리오_합본.docx", "비주얼레퍼런스.pdf"],
  },

  E: {
    letter: "E",
    name: "애니 시리즈",
    sub: "TV/OTT 시리즈",
    steps: ["의뢰 분석", "시즌 아크 설계", "에피별 소아크", "1화 대본", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "판타지", "모험", "일상/슬라이스 오브 라이프", "코미디", "액션", "스포츠", "로맨스",
          "SF/메카", "마법소녀", "이세계물", "스릴러/미스터리", "혼합",
        ],
      },
      {
        key: "ep_length",
        label: "1편 분량",
        type: "select",
        options: ["12분 (어린이용 짧은 편)", "24분 (표준)", "10분 (숏폼)", "기타"],
      },
      {
        key: "ep_count",
        label: "시즌당 화수",
        type: "select",
        options: ["8화", "10화", "12화", "13화", "22화", "24화", "26화", "기타"],
      },
      {
        key: "target_age",
        label: "타겟 연령",
        type: "select",
        options: ["유아 (~6세)", "어린이 (7~12)", "청소년 (13~17)", "성인 (18+)"],
      },
      ...commonWritingFields(),
      {
        key: "season_arc",
        label: "시즌 아크 (3시즌까지 갈 빅스토리)",
        type: "textarea",
      },
    ],
    export_format: "scene_dialogue",
    output_files: ["시즌1_기획서.docx", "S01E01.docx ~ S01E{N}.docx"],
  },

  F: {
    letter: "F",
    name: "웹툰",
    sub: "회당 65~75컷",
    steps: ["의뢰 분석", "캐릭터·세계관 정리", "기승전결 구성", "회차/엔딩컷 설계", "EP01 컷 작성", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "로맨스 판타지 (로판)", "현대 판타지 (현판)", "판타지", "액션", "드라마", "일상",
          "호러/스릴러", "SF", "사극", "코미디", "BL/GL", "회귀/환생", "혼합",
        ],
      },
      {
        key: "trope",
        label: "트로프 (선택, 복수)",
        type: "multiselect",
        options: [
          "회귀", "환생", "빙의", "이세계 이동", "악역 영애", "재벌물", "학원물", "동거물",
          "복수극", "성장형 주인공", "사기캐 X (안 씀)",
        ],
      },
      {
        key: "length_target",
        label: "분량 감 (대략)",
        type: "select",
        options: ["단편 (~30화)", "중편 (50~80화)", "장편 (100화+)", "장편 시리즈 (200화+)", "아직 미정 — 쓰면서 정함"],
        default: "아직 미정 — 쓰면서 정함",
      },
      ...commonWritingFields(),
      {
        key: "blank_space",
        label: "(각색 시만) 원본의 '빈 공간'",
        type: "textarea",
        placeholder: "원작에서 보여주지 않은 과거/서브 캐릭터 사연 등 — 신작이면 비워두세요",
      },
    ],
    export_format: "webtoon_cuts",
    output_files: ["기획서.txt", "캐릭터시트.txt", "회차구성표.txt", "EP01.txt ~ EP{N}.txt"],
  },

  G: {
    letter: "G",
    name: "다큐멘터리",
    sub: "방송·OTT",
    steps: ["의뢰 분석", "기획안", "챕터 구성", "인터뷰 대상 선정", "구성안/큐시트 작성", "내레이션 원고", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "휴먼 다큐", "시사 다큐", "역사 다큐", "자연/과학", "예술/문화", "여행/풍물",
          "범죄/르포", "탐사 보도", "인물 탐구", "교육", "혼합",
        ],
      },
      {
        key: "duration",
        label: "분량",
        type: "select",
        options: ["30분 (TV 미니)", "45분 (TV)", "60분 (TV)", "90분 (극장)", "시리즈 (회당 50분 × N회)", "기타"],
      },
      {
        key: "format_type",
        label: "양식 타입",
        type: "select",
        options: ["큐시트형 (방송용 2단)", "구성안형 (기획용 줄글)", "콘티형 (시간순 컷별)"],
      },
      {
        key: "narration_pov",
        label: "화법",
        type: "select",
        options: ["1인칭 관찰자", "3인칭 르포", "인터뷰 중심", "혼합"],
      },
      ...commonWritingFields(),
      {
        key: "core_question",
        label: "다큐의 핵심 질문 (한 줄)",
        type: "textarea",
        placeholder: "예) '안정된 직장은 정말 안정될 수 있었나?'",
      },
      {
        key: "reenactment",
        label: "재연 비율 (%)",
        type: "number",
        min: 0,
        max: 100,
        default: 10,
      },
    ],
    export_format: "documentary_cuesheet",
    output_files: ["기획안.docx", "구성안.docx 또는 큐시트.docx", "내레이션_원고.docx"],
  },

  H: {
    letter: "H",
    name: "웹소설",
    sub: "장르 소설 200~500화",
    steps: ["의뢰 분석", "세계관 구축", "캐릭터 시트", "전체 플롯", "1~5화 (인생 결정 구간)", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "판타지", "현대 판타지", "무협", "회귀물", "환생물", "SF",
          "로맨스 판타지", "현대 로맨스", "BL/GL", "악역 영애", "이세계물", "혼합",
        ],
      },
      {
        key: "trope",
        label: "트로프",
        type: "multiselect",
        options: [
          "회귀", "환생", "차원이동", "빙의", "악역영애", "재벌물", "사기캐 X (성장형)",
          "후회 트리거", "재능 만개", "능력 각성",
        ],
      },
      {
        key: "total_episodes",
        label: "완결 분량",
        type: "select",
        options: ["100화 (단편)", "200화", "300화", "500화", "1000화+ (장편)", "미정"],
      },
      {
        key: "chars_per_ep",
        label: "회당 글자 수 (공백 포함)",
        type: "select",
        options: ["3,000자", "4,000자", "5,000~5,500자 (네이버/카카오 표준)", "6,000자", "미정"],
      },
      ...commonWritingFields(),
    ],
    export_format: "webnovel_text",
    output_files: ["세계관.docx", "캐릭터시트.docx", "플롯.docx", "제01화.txt ~ 제{N}화.txt"],
  },

  I: {
    letter: "I",
    name: "뮤지컬",
    sub: "공연 무대",
    steps: ["의뢰 분석", "2막 구조 설계", "넘버 리스트", "캐릭터 시트", "트리트먼트", "대본 초안", "humanizer 검증"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "로맨스", "역사극", "코미디", "비극", "사회극", "전기 (실존 인물)",
          "팝뮤지컬", "록뮤지컬", "어린이 뮤지컬", "창작/오리지널", "라이선스 각색", "혼합",
        ],
      },
      {
        key: "venue_size",
        label: "극장 규모",
        type: "select",
        options: ["대극장 (1,000석+)", "중극장 (300~700석)", "소극장 (~300석)", "미정"],
      },
      {
        key: "duration",
        label: "공연 분량",
        type: "select",
        options: ["90분 (1막)", "120분 (2막+인터미션)", "150분 (대형)", "180분+ (대작)", "미정"],
      },
      {
        key: "song_count",
        label: "넘버 개수 (대략)",
        type: "number",
        min: 8,
        max: 30,
        default: 16,
      },
      ...commonWritingFields(),
      {
        key: "act1_climax",
        label: "1막 끝 강력한 전환점 (인터미션 후 관객 돌아오게 하는 것)",
        type: "textarea",
      },
      {
        key: "eleven_oclock",
        label: "11시 넘버 (클라이맥스 곡)",
        type: "textarea",
      },
    ],
    export_format: "musical_libretto",
    output_files: ["대본.docx", "넘버리스트.docx", "시놉시스.docx", "캐릭터시트.docx"],
  },

  J: {
    letter: "J",
    name: "유튜브",
    sub: "쇼츠·미드폼·롱폼",
    steps: ["채널 컨셉 정의", "회차 기획", "썸네일/제목 컨셉", "첫 3초 후크 설계", "본론 흐름", "자막 대본"],
    fields: [
      {
        key: "sub_genre",
        label: "콘텐츠 유형",
        type: "select",
        options: [
          "스토리텔링", "해설/리뷰", "브이로그", "교육/튜토리얼", "코미디/예능",
          "다큐/르포", "인터뷰", "ASMR/힐링", "음악/MV", "게임", "캐릭터 스핀오프", "혼합",
        ],
      },
      {
        key: "length_type",
        label: "콘텐츠 길이",
        type: "select",
        options: ["쇼츠 (60초 이하)", "1~3분 (초단편)", "5~15분 (미드폼)", "20~40분 (롱폼)", "1시간+ (대화/팟캐스트)"],
      },
      ...commonWritingFields({ exclude: ["first_hook"] }),
      {
        key: "first_3sec",
        label: "첫 3초 후크 (★ 가장 중요)",
        type: "textarea",
        placeholder: "충격적인 사실/질문/소리. 시청자가 멈출 한 줄.",
      },
      {
        key: "main_content",
        label: "본론에 다룰 핵심 내용 / 줄거리",
        type: "textarea",
        placeholder:
          "콘텐츠 유형에 맞춰 작성:\n" +
          "• 스토리텔링: 기승전결 흐름 (예: 1) 평범한 일상  2) 사건 발생  3) 진실 발견  4) 결말)\n" +
          "• 해설/리뷰: 핵심 주장 + 근거 3가지 + 반박\n" +
          "• 브이로그: 하루 흐름 / 분위기 키워드\n" +
          "• 교육/튜토리얼: 학습 목표 + 단계 + 예시\n" +
          "• 게임: 플레이 포인트 + 해설 톤\n" +
          "• 캐릭터 스핀오프: 원작 IP + 이번 회차 컨셉",
      },
      {
        key: "thumbnail_concept",
        label: "썸네일 컨셉 (한 줄)",
        type: "text",
        placeholder: "예: 주인공 컵 안의 시체 + '이 카페에 다신 안 갑니다'",
      },
      {
        key: "cta",
        label: "콜투액션 (영상 끝에 무엇을 시킬지)",
        type: "text",
        placeholder: "예: 다음 화 구독 / 댓글 / 공유 / 굿즈 구매",
      },
    ],
    export_format: "youtube_script",
    output_files: ["컨셉기획서.docx", "콘텐츠리스트.xlsx", "EP01_대본.docx ~"],
  },

  K: {
    letter: "K",
    name: "전시",
    sub: "공간·체험형",
    steps: ["컨셉 정의", "타겟/면적 결정", "9존 동선 설계", "존별 스토리", "인터랙티브 요소", "굿즈 라인업"],
    fields: [
      {
        key: "sub_genre",
        label: "전시 유형",
        type: "select",
        options: [
          "IP 기반 (캐릭터/작품)", "미디어아트", "체험형 (실감/VR/AR)",
          "역사/문화", "예술", "교육", "혼합",
        ],
      },
      {
        key: "area",
        label: "전시 면적 (대략)",
        type: "select",
        options: ["100평 미만 (소형)", "100~300평 (중형)", "300~500평", "500~1000평", "1000평+ (대형)", "미정"],
      },
      {
        key: "zone_count",
        label: "존 구성",
        type: "select",
        options: ["3~4존 (소형)", "5~6존 (중형)", "7~9존 (표준)", "10존+ (대형)", "미정"],
      },
      ...commonWritingFields(),
      {
        key: "main_target",
        label: "메인 타겟",
        type: "select",
        options: ["10대", "20대", "커플", "가족", "전 연령", "키덜트"],
      },
      {
        key: "interactive",
        label: "인터랙티브 요소 (있다면)",
        type: "multiselect",
        options: ["선택형 분기", "음성 인식", "모션 센서", "AR 마커", "VR 헤드셋", "터치 디스플레이", "포토존"],
      },
    ],
    export_format: "exhibition_plan",
    output_files: ["기획안.pdf", "평면도.pdf", "존별스토리.docx", "굿즈라인업.xlsx"],
  },

  L: {
    letter: "L",
    name: "게임",
    sub: "인터랙티브 시나리오",
    steps: ["의뢰 분석", "메인 라인 설계", "분기 매트릭스", "엔딩 설계", "캐릭터 시트", "대사 데이터 작성", "컷씬 시나리오"],
    fields: [
      {
        key: "sub_genre",
        label: "서브 장르",
        type: "select",
        options: [
          "RPG", "비주얼노벨", "어드벤처", "인터랙티브 픽션", "MMO/MMORPG",
          "오픈월드", "액션 RPG", "전략", "퍼즐", "공포/생존", "수집형", "혼합",
        ],
      },
      {
        key: "branch_count",
        label: "분기 수",
        type: "select",
        options: ["선형 (분기 없음)", "2~3분기", "다분기 (5+)", "복잡한 트리 구조", "미정"],
      },
      {
        key: "ending_count",
        label: "엔딩 수",
        type: "select",
        options: ["1엔딩", "굿/노멀/배드 (3엔딩)", "5+ 멀티엔딩", "10+ 트루엔딩 시스템", "미정"],
      },
      {
        key: "playtime",
        label: "메인 플레이타임 (대략)",
        type: "select",
        options: [
          "1~5시간 (단편)", "5~10시간 (모바일/단편 RPG)", "30시간 (모바일 RPG)",
          "50시간 (정통 RPG)", "100시간+ (AAA/오픈월드)", "미정",
        ],
      },
      ...commonWritingFields(),
      {
        key: "affinity",
        label: "캐릭터 호감도 시스템",
        type: "select",
        options: ["사용", "사용 안 함", "미정"],
      },
    ],
    export_format: "game_dialogue_data",
    output_files: ["메인스토리.docx", "대사데이터.xlsx", "컷씬시나리오.docx", "캐릭터시트.docx"],
  },

  M: {
    letter: "M",
    name: "예능",
    sub: "TV·웹 버라이어티",
    steps: ["포맷 정의", "MC/게스트 캐스팅", "코너 구성 (3~5코너)", "큐시트 작성", "예상 자막 포인트", "인터뷰 질문지"],
    fields: [
      {
        key: "sub_genre",
        label: "포맷",
        type: "select",
        options: [
          "관찰", "리얼리티", "토크", "게임", "오디션", "여행", "먹방", "다큐버라이어티",
          "토론/시사", "코미디 콩트", "인터뷰", "리얼 버라이어티", "스튜디오 토크쇼", "혼합",
        ],
      },
      {
        key: "ep_length",
        label: "1편 분량",
        type: "select",
        options: ["10~20분 (웹 예능 짧음)", "30분 (TV 미니)", "60분 (TV)", "90분 (TV 정규)", "100분+ (롱폼)"],
      },
      {
        key: "mc_count",
        label: "MC 수",
        type: "select",
        options: ["1MC", "2MC", "다인 MC (3~)", "미정"],
      },
      {
        key: "guests_per_ep",
        label: "회당 게스트 인원",
        type: "number",
        min: 0,
        max: 15,
        default: 3,
      },
      {
        key: "fixed_members",
        label: "고정 멤버 (이름 / 캐릭터 톤)",
        type: "textarea",
        placeholder: "예: A(진행/배려) / B(엉뚱함) / C(허당)",
      },
      {
        key: "corner_count",
        label: "코너 수",
        type: "number",
        min: 1,
        max: 8,
        default: 4,
      },
      ...commonWritingFields(),
      {
        key: "shoot_type",
        label: "촬영 형식 (선택)",
        type: "select",
        options: ["스튜디오", "야외", "혼합", "미정"],
      },
    ],
    export_format: "variety_cuesheet",
    output_files: ["포맷기획서.docx", "회차큐시트.xlsx", "자막대본.docx", "인터뷰질문지.docx"],
  },
  N: {
    letter: "N",
    name: "연극",
    sub: "무대 · 1막·2막·다막극",
    steps: ["공연 컨셉", "등장인물·시놉시스", "막·장 구성", "희곡 본문", "무대 지시·동선"],
    fields: [
      {
        key: "act_format",
        label: "막 구성",
        type: "select",
        options: ["1막극 (60~90분)", "2막극 (90~120분)", "다막극 (120분+)", "낭독극 (40~60분)", "기타"],
      },
      {
        key: "stage_type",
        label: "무대 형식",
        type: "select",
        options: ["프로시니엄", "원형 (Arena)", "돌출 (Thrust)", "블랙박스", "야외 / 사이트스페시픽", "미정"],
      },
      {
        key: "cast_count",
        label: "출연진 수",
        type: "number",
        min: 1,
        max: 30,
        default: 5,
      },
      {
        key: "ensemble",
        label: "앙상블 / 멀티롤",
        type: "select",
        options: ["없음 (1인 1역)", "있음 (1인 다역)", "코러스/앙상블", "미정"],
      },
      ...commonWritingFields(),
      {
        key: "production_scale",
        label: "제작 규모",
        type: "select",
        options: ["소극장 (100석 이하)", "중극장 (300~500석)", "대극장 (700석+)", "투어 / 페스티벌", "미정"],
      },
    ],
    export_format: "stage_playscript",
    output_files: ["희곡.hwp", "캐릭터시트.docx", "무대지시서.docx"],
  },
  O: {
    letter: "O",
    name: "소설",
    sub: "단편 · 중편 · 장편 (일반문학)",
    steps: ["작품 기획", "캐릭터·세계", "플롯", "본문 집필", "퇴고·문장"],
    fields: [
      {
        key: "novel_length",
        label: "분량",
        type: "select",
        options: ["콩트 (10매 이내)", "단편 (50~100매)", "중편 (200~400매)", "장편 (700매+)", "연작 단편집"],
      },
      {
        key: "novel_genre",
        label: "장르",
        type: "select",
        options: ["순문학", "추리·미스터리", "SF", "판타지", "역사", "로맨스", "공포·스릴러", "성장·청소년", "혼합"],
      },
      {
        key: "narrative_pov",
        label: "서술 시점",
        type: "select",
        options: ["1인칭 주인공", "1인칭 관찰자", "3인칭 전지적", "3인칭 제한적", "다중 시점", "미정"],
      },
      {
        key: "tense",
        label: "시제",
        type: "select",
        options: ["과거형", "현재형", "혼합", "미정"],
      },
      ...commonWritingFields(),
      {
        key: "publication_target",
        label: "출간 형태 (선택)",
        type: "select",
        options: ["문예지 게재", "단행본", "공모전 응모", "독립출판·웹게재", "미정"],
      },
    ],
    export_format: "novel_manuscript",
    output_files: ["본문.hwp", "캐릭터노트.docx", "구성안.docx"],
  },
  P: {
    letter: "P",
    name: "에세이",
    sub: "산문 · 칼럼 · 일기",
    steps: ["주제·관점", "구성·흐름", "본문", "퇴고·문장"],
    fields: [
      {
        key: "essay_type",
        label: "에세이 형식",
        type: "select",
        options: ["짧은 글 (1~3p)", "중편 에세이 (5~10p)", "에세이집 (책 한 권)", "칼럼 시리즈", "여행기·기행", "리뷰·비평"],
      },
      {
        key: "voice_person",
        label: "화자 (인칭)",
        type: "select",
        options: ["1인칭 (나)", "3인칭 객관", "혼합", "미정"],
      },
      {
        key: "topic_focus",
        label: "주제 영역",
        type: "select",
        options: ["일상·관찰", "사회·시사", "예술·문화", "여행·공간", "인물·관계", "자기성찰", "기술·과학", "혼합"],
      },
      ...commonWritingFields(),
      {
        key: "publication_target",
        label: "발표 형태 (선택)",
        type: "select",
        options: ["블로그·SNS", "매체 칼럼", "단행본 에세이집", "공모전", "미정"],
      },
    ],
    export_format: "essay_prose",
    output_files: ["에세이.docx", "구성노트.docx"],
  },
};

export function getWorkflow(letter: string): MediumWorkflow {
  return WORKFLOWS[letter] ?? WORKFLOWS.A;
}

export const WORKFLOW_LETTERS = Object.keys(WORKFLOWS);

// 매체별 빠른 액션 (홈에 노출되는 3~4개 핵심 단계 — V2 어댑티브 홈에서 사용)
export const QUICK_ACTIONS: Record<string, string[]> = {
  A: ["회차 구성", "1화 씬 구성", "대본 초안"],
  B: ["트리트먼트", "시퀀스 분할", "대본 초안"],
  C: ["페이월 5블록 설계", "클리프행어 맵", "에피별 구성"],
  D: ["트리트먼트", "비주얼 컨셉", "시퀀스 분할"],
  E: ["시즌 아크 설계", "에피별 소아크", "1화 대본"],
  F: ["캐릭터·세계관 정리", "회차/엔딩컷 설계", "EP01 컷 작성"],
  G: ["인터뷰 대상 선정", "구성안/큐시트 작성", "내레이션 원고"],
  H: ["세계관 구축", "전체 플롯", "1~5화 인생 결정 구간"],
  I: ["2막 구조 설계", "넘버 리스트", "대본 초안"],
  J: ["회차 기획", "첫 3초 후크 설계", "자막 대본"],
  K: ["9존 동선 설계", "존별 스토리", "굿즈 라인업"],
  L: ["메인 라인 설계", "분기 매트릭스", "대사 데이터 작성"],
  M: ["코너 구성", "큐시트 작성", "인터뷰 질문지"],
  N: ["등장인물 시트", "막·장 구성", "희곡 본문"],
  O: ["캐릭터 노트", "전체 플롯", "본문 1장"],
  P: ["주제 정리", "구성 흐름", "본문 초안"],
};

// 매체별 hero placeholder (홈 어댑티브용)
export const HERO_PLACEHOLDERS: Record<string, string> = {
  A: "예) 번아웃으로 퇴사한 30대 직장인이 시골 카페를 인수하면서 벌어지는 일",
  B: "예) 잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
  C: "예) 회귀한 악역 영애가 약혼자에게 첫눈에 반한다",
  D: "예) 색이 바뀌는 요괴 소녀가 100년 만에 깨어난다",
  E: "예) 매일 다른 차원으로 떨어지는 소년의 모험",
  F: "예) 평범한 카페 알바생이 손님 컵 안에서 자기 시체를 발견한다",
  G: "예) 안정된 직장은 정말 안정될 수 있었나?",
  H: "예) 회귀한 황녀가 전생에 죽인 약혼자를 다시 만난다",
  I: "예) 죽기 전 마지막 노래를 부르는 시한부 가수의 인생 회상",
  J: "예) 이 카페에 가면 다신 안 옵니다 — 첫 3초에 잡는 한 줄",
  K: "예) 100년 전 사라진 도시의 9개 방을 따라 시간을 거슬러 가는 체험",
  L: "예) 5개 엔딩으로 갈리는 RPG, 첫 선택에서 모든 게 결정된다",
  M: "예) 매주 다른 게스트와 진짜 음식 만들기 — 실패해도 먹는다",
  N: "예) 마지막 공연을 앞둔 늙은 배우와 처음 무대에 서는 손녀, 한 무대 위에서 부딪힌다",
  O: "예) 30년 동안 하루도 빠짐없이 일기를 쓴 노인이 어느 날 자기 일기를 읽지 못하게 된다",
  P: "예) 매일 같은 시간 같은 자리에서 마주치던 낯선 사람이 어느 날부터 보이지 않는다",
};