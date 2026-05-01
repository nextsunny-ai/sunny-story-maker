"""장르별 워크플로우 — 글쓰기 단계에 진짜 필요한 입력만.
플랫폼/유통/연재 빈도/수익 모델 같은 출간 단계 정보는 제외 (집필 후 별도)."""


# ============================================================
# 공통 필드 — 모든 장르에 적용되는 글쓰기 본질
# ============================================================
def common_writing_fields(extra: list = None, exclude: list = None) -> list:
    """매체 무관 글쓰기 필수 입력 — 장르/타겟/톤/주인공/시점/세계관/후크
    exclude: 매체별로 빼고 싶은 키 (예: 유튜브는 first_hook 제외)"""
    exclude = exclude or []
    base = [
        # ★ 타겟 — 톤을 결정하는 핵심 (작가가 명시적으로 정함)
        {"key": "target_audience", "label": "타겟 (연령/특성 — 톤 결정에 영향)", "type": "select",
         "options": [
             "10대 (청소년, 학원물·로판·판타지 강세)",
             "20대 초반 (대학생, 트렌드 민감)",
             "20대 도시 직장인 여성",
             "20대 남성 (게이머/오타쿠/액션 선호)",
             "30대 직장인 여성 (현실+위로)",
             "30대 직장인 남성 (장르+세계관)",
             "40~50대 가족 시청자 (휴머니즘+안정)",
             "중장년 (50+, 가족극/시사)",
             "키덜트/마니아 (장르 깊이)",
             "글로벌 한류팬 (영문권 18~35)",
             "전 연령 (가족용)",
             "기타",
         ]},
        {"key": "tone", "label": "톤 (타겟에 맞춰)", "type": "select",
         "options": ["다크", "밝은/유쾌", "시네마틱", "잔잔/일상적", "강렬/긴장", "감성/위로", "신랄/풍자", "혼합", "기타"]},
        {"key": "protagonist_count", "label": "주인공 구성", "type": "select",
         "options": [
             "1인 단독 (원톱)",
             "2인 듀오 (로맨스/버디)",
             "3인 트리오",
             "다수 앙상블 (4~6인)",
             "옴니버스 (회마다 다른 주인공)",
         ], "default": "1인 단독 (원톱)"},
        {"key": "pov", "label": "시점", "type": "select",
         "options": ["1인칭", "3인칭 한정시점", "3인칭 전지적", "다중 시점", "관찰자 시점"]},
        {"key": "protagonist", "label": "주인공 한 줄 (이름 + 핵심 결핍)", "type": "textarea",
         "placeholder": "예) 강하은(28). 5년째 야간 카페 알바. 자기 이야기는 한 번도 써본 적 없음."},
        {"key": "antagonist", "label": "적대자/장애물 한 줄 (없으면 비워두세요)", "type": "textarea",
         "placeholder": "예) 죽은 어머니가 남긴 빚. 또는 자기 안의 두려움."},
        {"key": "era", "label": "시대 배경", "type": "select",
         "options": [
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
             "기타",
         ]},
        {"key": "space", "label": "공간 배경 (대략)", "type": "select",
         "options": [
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
         ]},
        {"key": "structure", "label": "구성 방식 (작법)", "type": "select",
         "options": [
             "기승전결 (한국·동양 표준)",
             "3막 구조 (Syd Field)",
             "5막 구조 (McKee)",
             "Hero's Journey (Joseph Campbell)",
             "Save the Cat 15비트 (Blake Snyder)",
             "옴니버스 (회마다 독립)",
             "프리스타일 (구조 자유)",
             "혼합",
             "미정 — AI 작가가 추천",
         ], "default": "미정 — AI 작가가 추천"},
        {"key": "world_one_line", "label": "세계관 한 줄 (특별한 룰/설정)", "type": "textarea",
         "placeholder": "예) 100년에 한 번 깨어나는 조선 요괴들이 SNS에 들킨다."},
        {"key": "first_hook", "label": "첫 장면/컷 후크 (무엇으로 독자/시청자를 잡을지)", "type": "textarea",
         "placeholder": "예) 평범한 카페 알바생이 손님 컵 안에서 자기 시체를 발견한다."},
    ]
    if exclude:
        base = [f for f in base if f["key"] not in exclude]
    if extra:
        base = (extra or []) + base
    return base


WORKFLOWS = {
    "A": {  # TV 드라마
        "steps": ["의뢰 분석", "회차 구성", "트리트먼트", "시놉시스", "1화 씬 구성", "대본 초안", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["로맨스", "로맨틱코미디", "멜로", "시대극/사극", "판타지", "스릴러/미스터리",
                         "법정/의학", "정치/시사", "가족/일상", "청춘/학원", "느와르/범죄", "코미디", "공포", "혼합"]},
            {"key": "episodes", "label": "회차 수", "type": "select",
             "options": ["1부작 (단편/스페셜)", "2부작", "4부작", "6부작", "8부작", "10부작",
                         "12부작", "14부작", "16부작", "20부작", "24부작", "기타 (직접 입력)"], "default": "12부작"},
            {"key": "episodes_custom", "label": "직접 입력 (위에서 '기타' 선택 시만)", "type": "text",
             "placeholder": "예: 8부작 / 시즌1 10화+시즌2 12화"},
            *common_writing_fields(),
            {"key": "ending_tone", "label": "엔딩 의도 (자유, 미정 OK)", "type": "select",
             "options": ["해피", "오픈", "비극", "여운", "반전", "미정"]},
        ],
        "export_format": "scene_dialogue",
        "output_files": ["기획서.docx", "EP01.docx ~ EP{N}.docx"],
    },
    "B": {  # 영화
        "steps": ["의뢰 분석", "트리트먼트", "시놉시스", "시퀀스 분할", "대본 초안", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["드라마", "로맨스", "코미디", "스릴러/미스터리", "공포/호러", "액션", "느와르/범죄",
                         "SF", "판타지", "사극/시대극", "다큐멘터리극", "전쟁", "음악/뮤지컬", "성장영화", "혼합"]},
            {"key": "runtime", "label": "러닝타임", "type": "select",
             "options": ["단편 (~30분)", "중편 (30~60분)", "90분", "100분", "120분", "150분", "기타 (직접 입력)"]},
            {"key": "runtime_custom", "label": "직접 입력 (위에서 '기타' 선택 시만)", "type": "text"},
            *common_writing_fields(),
            {"key": "rating_intent", "label": "수위 의도 (글쓰기 자기검열 기준)", "type": "select",
             "options": ["전 연령", "12세", "15세", "청불 (수위 강함)", "미정"]},
            {"key": "opening_closing", "label": "오프닝 ↔ 클로징 이미지 대칭 컨셉 (있다면)", "type": "textarea",
             "placeholder": "예) 오프닝: 빈 카페 / 클로징: 가득 찬 카페"},
        ],
        "export_format": "scene_dialogue",
        "output_files": ["기.docx 승.docx 전.docx 결.docx", "시나리오_합본.docx", "시놉시스.docx", "캐릭터시트.docx"],
    },
    "C": {  # 숏드라마
        "steps": ["의뢰 분석", "페이월 5블록 설계", "클리프행어 맵", "캐릭터 시트", "에피별 구성", "대사 초안", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["로맨스 판타지 (로판)", "복수극", "재벌물", "회귀물", "차원이동/이세계", "환생/빙의",
                         "오피스 로맨스", "막장 가족", "복수+로맨스", "현대 판타지", "사극 판타지", "혼합"]},
            {"key": "total_episodes", "label": "총 부작 수", "type": "select",
             "options": ["30화 (미니)", "40화", "50화", "60화", "70화", "80화", "90화", "100화", "120화",
                         "150화", "200화 (장편)", "기타 (직접 입력)"], "default": "80화"},
            {"key": "total_episodes_custom", "label": "직접 입력 (위에서 '기타' 선택 시만)", "type": "text"},
            *common_writing_fields(),
            {"key": "free_zone", "label": "무료 구간 (몇 화까지 무료, 0=정함)", "type": "number",
             "min": 0, "max": 30, "default": 10},
            {"key": "paywall_bomb", "label": "페이월 직후 폭탄 (있다면)", "type": "textarea",
             "placeholder": "결제한 사람이 '잘했다' 느낄 큰 반전. 미정이면 비워두세요."},
            {"key": "cliff_types", "label": "클리프행어 유형 (5가지 번갈아)", "type": "multiselect",
             "options": ["정보형", "감정형", "위험형", "선택형", "시간 압박"]},
        ],
        "export_format": "shortdrama_episode",
        "output_files": ["시즌기획서.docx (5블록맵+클리프행어맵)", "EP001.docx ~ EP{N}.docx"],
    },
    "D": {  # 극장 애니
        "steps": ["의뢰 분석", "트리트먼트", "비주얼 컨셉", "시놉시스", "시퀀스 분할", "대본 초안", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["판타지", "모험", "성장", "SF", "코미디", "감동/드라마", "공포", "액션",
                         "음악/뮤지컬", "사극/신화", "혼합"]},
            {"key": "target_age", "label": "타겟 연령", "type": "select",
             "options": ["전 연령 (가족)", "어린이 (~10세)", "청소년 (10~17)", "성인 지향 (18+)"]},
            *common_writing_fields(),
            {"key": "why_anime", "label": "왜 애니메이션이어야 하는가? (실사로 못 찍는 이유)", "type": "textarea",
             "placeholder": "예) 주인공이 색이 바뀌는 요괴라 실사 분장으로는 표현 불가"},
            {"key": "climax_visual", "label": "클라이맥스 비주얼 (셀링포인트, 글로 묘사)", "type": "textarea"},
            {"key": "music_concept", "label": "음악 컨셉 (있다면)", "type": "select",
             "options": ["오리지널 OST", "기존곡 활용", "뮤지컬형 (캐릭터가 노래 부름)", "음악 최소", "미정"]},
        ],
        "export_format": "anime_scene",
        "output_files": ["시놉시스.docx", "캐릭터시트(디자인포함).docx", "시나리오_합본.docx", "비주얼레퍼런스.pdf"],
    },
    "E": {  # 애니 시리즈
        "steps": ["의뢰 분석", "시즌 아크 설계", "에피별 소아크", "1화 대본", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["판타지", "모험", "일상/슬라이스 오브 라이프", "코미디", "액션", "스포츠", "로맨스",
                         "SF/메카", "마법소녀", "이세계물", "스릴러/미스터리", "혼합"]},
            {"key": "ep_length", "label": "1편 분량", "type": "select",
             "options": ["12분 (어린이용 짧은 편)", "24분 (표준)", "10분 (숏폼)", "기타"]},
            {"key": "ep_count", "label": "시즌당 화수", "type": "select",
             "options": ["8화", "10화", "12화", "13화", "22화", "24화", "26화", "기타"]},
            {"key": "target_age", "label": "타겟 연령", "type": "select",
             "options": ["유아 (~6세)", "어린이 (7~12)", "청소년 (13~17)", "성인 (18+)"]},
            *common_writing_fields(),
            {"key": "season_arc", "label": "시즌 아크 (3시즌까지 갈 빅스토리)", "type": "textarea"},
        ],
        "export_format": "scene_dialogue",
        "output_files": ["시즌1_기획서.docx", "S01E01.docx ~ S01E{N}.docx"],
    },
    "F": {  # 웹툰
        "steps": ["의뢰 분석", "캐릭터·세계관 정리", "기승전결 구성", "회차/엔딩컷 설계", "EP01 컷 작성", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["로맨스 판타지 (로판)", "현대 판타지 (현판)", "판타지", "액션", "드라마", "일상",
                         "호러/스릴러", "SF", "사극", "코미디", "BL/GL", "회귀/환생", "혼합"]},
            {"key": "trope", "label": "트로프 (선택, 복수)", "type": "multiselect",
             "options": ["회귀", "환생", "빙의", "이세계 이동", "악역 영애", "재벌물", "학원물", "동거물",
                         "복수극", "성장형 주인공", "사기캐 X (안 씀)"]},
            {"key": "length_target", "label": "분량 감 (대략)", "type": "select",
             "options": ["단편 (~30화)", "중편 (50~80화)", "장편 (100화+)", "장편 시리즈 (200화+)",
                         "아직 미정 — 쓰면서 정함"], "default": "아직 미정 — 쓰면서 정함"},
            *common_writing_fields(),
            {"key": "blank_space", "label": "(각색 시만) 원본의 '빈 공간'", "type": "textarea",
             "placeholder": "원작에서 보여주지 않은 과거/서브 캐릭터 사연 등 — 신작이면 비워두세요"},
        ],
        "export_format": "webtoon_cuts",
        "output_files": ["기획서.txt", "캐릭터시트.txt", "회차구성표.txt", "EP01.txt ~ EP{N}.txt"],
    },
    "G": {  # 다큐
        "steps": ["의뢰 분석", "기획안", "챕터 구성", "인터뷰 대상 선정", "구성안/큐시트 작성", "내레이션 원고", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["휴먼 다큐", "시사 다큐", "역사 다큐", "자연/과학", "예술/문화", "여행/풍물",
                         "범죄/르포", "탐사 보도", "인물 탐구", "교육", "혼합"]},
            {"key": "duration", "label": "분량", "type": "select",
             "options": ["30분 (TV 미니)", "45분 (TV)", "60분 (TV)", "90분 (극장)", "시리즈 (회당 50분 × N회)", "기타"]},
            {"key": "format_type", "label": "양식 타입", "type": "select",
             "options": ["큐시트형 (방송용 2단)", "구성안형 (기획용 줄글)", "콘티형 (시간순 컷별)"]},
            {"key": "narration_pov", "label": "화법", "type": "select",
             "options": ["1인칭 관찰자", "3인칭 르포", "인터뷰 중심", "혼합"]},
            *common_writing_fields(),
            {"key": "core_question", "label": "다큐의 핵심 질문 (한 줄)", "type": "textarea",
             "placeholder": "예) '안정된 직장은 정말 안정될 수 있었나?'"},
            {"key": "reenactment", "label": "재연 비율 (%)", "type": "number", "min": 0, "max": 100, "default": 10},
        ],
        "export_format": "documentary_cuesheet",
        "output_files": ["기획안.docx", "구성안.docx 또는 큐시트.docx", "내레이션_원고.docx"],
    },
    "H": {  # 웹소설
        "steps": ["의뢰 분석", "세계관 구축", "캐릭터 시트", "전체 플롯", "1~5화 (인생 결정 구간)", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["판타지", "현대 판타지", "무협", "회귀물", "환생물", "SF",
                         "로맨스 판타지", "현대 로맨스", "BL/GL", "악역 영애", "이세계물", "혼합"]},
            {"key": "trope", "label": "트로프", "type": "multiselect",
             "options": ["회귀", "환생", "차원이동", "빙의", "악역영애", "재벌물", "사기캐 X (성장형)",
                         "후회 트리거", "재능 만개", "능력 각성"]},
            {"key": "total_episodes", "label": "완결 분량", "type": "select",
             "options": ["100화 (단편)", "200화", "300화", "500화", "1000화+ (장편)", "미정"]},
            {"key": "chars_per_ep", "label": "회당 글자 수 (공백 포함)", "type": "select",
             "options": ["3,000자", "4,000자", "5,000~5,500자 (네이버/카카오 표준)", "6,000자", "미정"]},
            *common_writing_fields(),
        ],
        "export_format": "webnovel_text",
        "output_files": ["세계관.docx", "캐릭터시트.docx", "플롯.docx", "제01화.txt ~ 제{N}화.txt"],
    },
    "I": {  # 뮤지컬
        "steps": ["의뢰 분석", "2막 구조 설계", "넘버 리스트", "캐릭터 시트", "트리트먼트", "대본 초안", "humanizer 검증"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["로맨스", "역사극", "코미디", "비극", "사회극", "전기 (실존 인물)",
                         "팝뮤지컬", "록뮤지컬", "어린이 뮤지컬", "창작/오리지널", "라이선스 각색", "혼합"]},
            {"key": "venue_size", "label": "극장 규모", "type": "select",
             "options": ["대극장 (1,000석+)", "중극장 (300~700석)", "소극장 (~300석)", "미정"]},
            {"key": "duration", "label": "공연 분량", "type": "select",
             "options": ["90분 (1막)", "120분 (2막+인터미션)", "150분 (대형)", "180분+ (대작)", "미정"]},
            {"key": "song_count", "label": "넘버 개수 (대략)", "type": "number", "min": 8, "max": 30, "default": 16},
            *common_writing_fields(),
            {"key": "act1_climax", "label": "1막 끝 강력한 전환점 (인터미션 후 관객 돌아오게 하는 것)", "type": "textarea"},
            {"key": "eleven_oclock", "label": "11시 넘버 (클라이맥스 곡)", "type": "textarea"},
        ],
        "export_format": "musical_libretto",
        "output_files": ["대본.docx", "넘버리스트.docx", "시놉시스.docx", "캐릭터시트.docx"],
    },
    "J": {  # 유튜브
        "steps": ["채널 컨셉 정의", "회차 기획", "썸네일/제목 컨셉", "첫 3초 후크 설계", "본론 흐름", "자막 대본"],
        "fields": [
            {"key": "sub_genre", "label": "콘텐츠 유형", "type": "select",
             "options": ["스토리텔링", "해설/리뷰", "브이로그", "교육/튜토리얼", "코미디/예능",
                         "다큐/르포", "인터뷰", "ASMR/힐링", "음악/MV", "게임", "캐릭터 스핀오프", "혼합"]},
            {"key": "length_type", "label": "콘텐츠 길이", "type": "select",
             "options": ["쇼츠 (60초 이하)", "1~3분 (초단편)", "5~15분 (미드폼)", "20~40분 (롱폼)", "1시간+ (대화/팟캐스트)"]},
            # 유튜브는 first_hook(공통)이 first_3sec와 중복 — first_hook만 제외
            # structure는 살림 (스토리텔링은 기승전결, 해설은 주장-근거 구조 등)
            *common_writing_fields(exclude=["first_hook"]),
            {"key": "first_3sec", "label": "첫 3초 후크 (★ 가장 중요)", "type": "textarea",
             "placeholder": "충격적인 사실/질문/소리. 시청자가 멈출 한 줄."},
            {"key": "main_content", "label": "본론에 다룰 핵심 내용 / 줄거리", "type": "textarea",
             "placeholder": (
                 "콘텐츠 유형에 맞춰 작성:\n"
                 "• 스토리텔링: 기승전결 흐름 (예: 1) 평범한 일상  2) 사건 발생  3) 진실 발견  4) 결말)\n"
                 "• 해설/리뷰: 핵심 주장 + 근거 3가지 + 반박\n"
                 "• 브이로그: 하루 흐름 / 분위기 키워드\n"
                 "• 교육/튜토리얼: 학습 목표 + 단계 + 예시\n"
                 "• 게임: 플레이 포인트 + 해설 톤\n"
                 "• 캐릭터 스핀오프: 원작 IP + 이번 회차 컨셉"
             )},
            {"key": "thumbnail_concept", "label": "썸네일 컨셉 (한 줄)", "type": "text",
             "placeholder": "예: 주인공 컵 안의 시체 + '이 카페에 다신 안 갑니다'"},
            {"key": "cta", "label": "콜투액션 (영상 끝에 무엇을 시킬지)", "type": "text",
             "placeholder": "예: 다음 화 구독 / 댓글 / 공유 / 굿즈 구매"},
        ],
        "export_format": "youtube_script",
        "output_files": ["컨셉기획서.docx", "콘텐츠리스트.xlsx", "EP01_대본.docx ~"],
    },
    "K": {  # 전시
        "steps": ["컨셉 정의", "타겟/면적 결정", "9존 동선 설계", "존별 스토리", "인터랙티브 요소", "굿즈 라인업"],
        "fields": [
            {"key": "sub_genre", "label": "전시 유형", "type": "select",
             "options": ["IP 기반 (캐릭터/작품)", "미디어아트", "체험형 (실감/VR/AR)",
                         "역사/문화", "예술", "교육", "혼합"]},
            {"key": "area", "label": "전시 면적 (대략)", "type": "select",
             "options": ["100평 미만 (소형)", "100~300평 (중형)", "300~500평", "500~1000평", "1000평+ (대형)", "미정"]},
            {"key": "zone_count", "label": "존 구성", "type": "select",
             "options": ["3~4존 (소형)", "5~6존 (중형)", "7~9존 (표준)", "10존+ (대형)", "미정"]},
            *common_writing_fields(),
            {"key": "main_target", "label": "메인 타겟", "type": "select",
             "options": ["10대", "20대", "커플", "가족", "전 연령", "키덜트"]},
            {"key": "interactive", "label": "인터랙티브 요소 (있다면)", "type": "multiselect",
             "options": ["선택형 분기", "음성 인식", "모션 센서", "AR 마커", "VR 헤드셋", "터치 디스플레이", "포토존"]},
        ],
        "export_format": "exhibition_plan",
        "output_files": ["기획안.pdf", "평면도.pdf", "존별스토리.docx", "굿즈라인업.xlsx"],
    },
    "L": {  # 게임
        "steps": ["의뢰 분석", "메인 라인 설계", "분기 매트릭스", "엔딩 설계", "캐릭터 시트", "대사 데이터 작성", "컷씬 시나리오"],
        "fields": [
            {"key": "sub_genre", "label": "서브 장르", "type": "select",
             "options": ["RPG", "비주얼노벨", "어드벤처", "인터랙티브 픽션", "MMO/MMORPG",
                         "오픈월드", "액션 RPG", "전략", "퍼즐", "공포/생존", "수집형", "혼합"]},
            {"key": "branch_count", "label": "분기 수", "type": "select",
             "options": ["선형 (분기 없음)", "2~3분기", "다분기 (5+)", "복잡한 트리 구조", "미정"]},
            {"key": "ending_count", "label": "엔딩 수", "type": "select",
             "options": ["1엔딩", "굿/노멀/배드 (3엔딩)", "5+ 멀티엔딩", "10+ 트루엔딩 시스템", "미정"]},
            {"key": "playtime", "label": "메인 플레이타임 (대략)", "type": "select",
             "options": ["1~5시간 (단편)", "5~10시간 (모바일/단편 RPG)", "30시간 (모바일 RPG)",
                         "50시간 (정통 RPG)", "100시간+ (AAA/오픈월드)", "미정"]},
            *common_writing_fields(),
            {"key": "affinity", "label": "캐릭터 호감도 시스템", "type": "select",
             "options": ["사용", "사용 안 함", "미정"]},
        ],
        "export_format": "game_dialogue_data",
        "output_files": ["메인스토리.docx", "대사데이터.xlsx", "컷씬시나리오.docx", "캐릭터시트.docx"],
    },
    "M": {  # 예능
        "steps": ["포맷 정의", "MC/게스트 캐스팅", "코너 구성 (3~5코너)", "큐시트 작성", "예상 자막 포인트", "인터뷰 질문지"],
        "fields": [
            {"key": "sub_genre", "label": "포맷", "type": "select",
             "options": ["관찰", "리얼리티", "토크", "게임", "오디션", "여행", "먹방", "다큐버라이어티",
                         "토론/시사", "코미디 콩트", "인터뷰", "리얼 버라이어티", "스튜디오 토크쇼", "혼합"]},
            {"key": "ep_length", "label": "1편 분량", "type": "select",
             "options": ["10~20분 (웹 예능 짧음)", "30분 (TV 미니)", "60분 (TV)", "90분 (TV 정규)", "100분+ (롱폼)"]},
            {"key": "mc_count", "label": "MC 수", "type": "select", "options": ["1MC", "2MC", "다인 MC (3~)", "미정"]},
            {"key": "guests_per_ep", "label": "회당 게스트 인원", "type": "number", "min": 0, "max": 15, "default": 3},
            {"key": "fixed_members", "label": "고정 멤버 (이름 / 캐릭터 톤)", "type": "textarea",
             "placeholder": "예: A(진행/배려) / B(엉뚱함) / C(허당)"},
            {"key": "corner_count", "label": "코너 수", "type": "number", "min": 1, "max": 8, "default": 4},
            *common_writing_fields(),
            {"key": "shoot_type", "label": "촬영 형식 (선택)", "type": "select",
             "options": ["스튜디오", "야외", "혼합", "미정"]},
        ],
        "export_format": "variety_cuesheet",
        "output_files": ["포맷기획서.docx", "회차큐시트.xlsx", "자막대본.docx", "인터뷰질문지.docx"],
    },
}


# 폰트 옵션 (작가가 선택, JS로 본문에 즉시 적용)
SCRIPT_FONTS = [
    {"name": "함초롬바탕 (시나리오 표준)", "css": "Hahmlet", "weight": [400, 500, 600, 700]},
    {"name": "나눔명조 (네이버 표준)", "css": "Nanum Myeongjo", "weight": [400, 700, 800]},
    {"name": "본명조 (Noto Serif KR)", "css": "Noto Serif KR", "weight": [400, 500, 600, 700]},
    {"name": "마루부리 (가독성 우수)", "css": "MaruBuri", "weight": [400, 700]},
    {"name": "KoPub 바탕 (출판 표준)", "css": "KoPubWorldBatang", "weight": [400]},
    {"name": "고운바탕 (Gowun Batang)", "css": "Gowun Batang", "weight": [400, 700]},
    {"name": "고운돋움 (Gowun Dodum)", "css": "Gowun Dodum", "weight": [400]},
    {"name": "나눔바른고딕", "css": "Nanum Gothic", "weight": [400, 700, 800]},
    {"name": "본고딕 (Noto Sans KR)", "css": "Noto Sans KR", "weight": [400, 500, 700]},
    {"name": "Gothic A1", "css": "Gothic A1", "weight": [400, 500, 700]},
]


def get_workflow(genre_letter: str) -> dict:
    """장르의 워크플로우 데이터 조회"""
    if genre_letter in WORKFLOWS:
        return WORKFLOWS[genre_letter]
    return {
        "steps": ["의뢰 분석", "트리트먼트", "시놉시스", "초안", "humanizer 검증"],
        "fields": common_writing_fields(),
        "export_format": "scene_dialogue",
        "output_files": ["시나리오.docx"],
    }
