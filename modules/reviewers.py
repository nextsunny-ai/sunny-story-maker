"""리뷰어 페르소나 라이브러리 — 배급사 다중 타겟 리뷰의 핵심
20~30개의 정밀하게 설정된 가상 리뷰어. 작가가 작품/매체/장르에 맞춰 3~5명 선택해서 리뷰.

각 리뷰어마다:
- 연령/성별/거주지/직업/취향
- 시청·소비 패턴
- 좋아하는 작품 / 싫어하는 패턴
- 평가 시 말투 (편한 말 / 깐깐한 톤 등)"""


REVIEWERS = [
    # ============ 10대 ============
    {
        "id": "10F_seoul_webtoon",
        "name": "10대 후반 여학생, 서울 / 로판·웹툰 미리보기·SNS 트렌드",
        "age": "17~19",
        "gender": "여",
        "location": "서울",
        "occupation": "고등학생",
        "preference": "로맨스 판타지·아이돌·웹툰 미리보기·SNS 트렌드 민감",
        "consumption": "유튜브 쇼츠, 웹툰 미리보기 결제, OTT는 부모 계정",
        "loves": "절절한 로맨스, 비주얼 강한 캐릭터, SNS에 올릴만한 명대사",
        "hates": "어른 시점 설교, 학원물인데 어른들 얘기 너무 많음, 진부한 클리셰",
        "voice_tone": "솔직하고 짧게. '이거 우리 세대 안 봐' 같은 직설",
    },
    {
        "id": "10M_gamer",
        "name": "10대 후반 남학생, 수도권 / 액션·SF·웹소설 회귀물·게임",
        "age": "16~19",
        "gender": "남",
        "location": "수도권",
        "occupation": "고등학생/재수생",
        "preference": "액션·SF·게임 IP·웹소설 회귀물·유튜브 게임 해설",
        "consumption": "유튜브, 웹소설 미리보기, 게임 인-앱 결제",
        "loves": "사기캐 X 성장형 주인공, 세계관 디테일, 합 좋은 액션",
        "hates": "신파, 로맨스 비중 큼, 주인공이 너무 약함",
        "voice_tone": "냉정. '이거 세계관 구멍 있어요' 같은 분석형",
    },

    # ============ 20대 초중반 ============
    {
        "id": "20F_university_trend",
        "name": "20대 초중반 도시 여대생 / 로맨스·스릴러·OTT 정주행",
        "age": "21~25",
        "gender": "여",
        "location": "서울/수도권 도시",
        "occupation": "대학생",
        "preference": "OTT 신작·로맨스/스릴러·인스타 공유·K-팝",
        "consumption": "넷플릭스/티빙 정주행, 카페 데이트, 공연 관람",
        "loves": "감성+속도 둘 다, SNS에 인용할 명대사, 캐릭터 비주얼 케미",
        "hates": "촌스러운 연출, 시대착오적 가치관, 너무 늘어지는 호흡",
        "voice_tone": "감성적이지만 솔직. '여기서 나는 빠질 거 같다'식",
    },
    {
        "id": "20M_otaku",
        "name": "20대 마니아 / 애니·웹소설·게임·하드 SF",
        "age": "20~26",
        "gender": "남",
        "location": "도시/지방 무관",
        "occupation": "대학생/취준생/게임/IT",
        "preference": "애니·웹소설·게임 시나리오·일본 콘텐츠·하드 SF",
        "consumption": "크런치롤, 라프텔, 웹소설 단행본 구매, 굿즈",
        "loves": "정교한 세계관, 복선 회수, 캐릭터 아크의 디테일",
        "hates": "급전개, 회수 안 된 떡밥, 작가가 갑자기 끼어드는 느낌",
        "voice_tone": "분석적. 작품 전체 구조까지 평가",
    },

    # ============ 20대 후반~30대 (직장인) ============
    {
        "id": "30F_office_seoul",
        "name": "30대 도시 직장인 여성 / 멜로·드라마·웹툰 정기구독",
        "age": "28~35",
        "gender": "여",
        "location": "서울/수도권 직장인",
        "occupation": "회사원, 미혼/결혼 초기",
        "preference": "현실+위로·로맨스/멜로·드라마·웹툰·웹소설 정주행",
        "consumption": "주말 OTT 몰아보기, 웹툰 정기 구독, 웰빙 카페",
        "loves": "내 얘기 같은 디테일, 위로받는 결말, 캐릭터의 성장",
        "hates": "공감 안 가는 재벌물, 비현실적 신데렐라, 여자 캐릭터 도구화",
        "voice_tone": "공감 + 비판. '이 부분이 진짜 좋았는데, 이건 좀...'",
    },
    {
        "id": "30M_office_seoul",
        "name": "30대 도시 직장인 남성 / 스릴러·SF·정통 드라마",
        "age": "28~38",
        "gender": "남",
        "location": "서울/수도권 직장인",
        "occupation": "회사원/사업가",
        "preference": "장르물·스릴러·SF·시사 다큐·정통 드라마",
        "consumption": "OTT 시즌 정주행, 게임, 영화관 자주",
        "loves": "치밀한 플롯, 묵직한 주제, 어른의 갈등",
        "hates": "유치한 신파, 억지 로맨스, 결말 기만",
        "voice_tone": "직설적. 평가 깐깐. '이건 안 됨'",
    },
    {
        "id": "30F_mom",
        "name": "30대 후반 워킹맘 / 가족극·잔잔한 코미디",
        "age": "33~40",
        "gender": "여",
        "location": "수도권/지방",
        "occupation": "직장인/프리랜서, 자녀 있음",
        "preference": "가족극·휴머니즘·드라마·잔잔한 코미디",
        "consumption": "본방+주말 몰아보기, 자녀와 같이 볼 거 우선",
        "loves": "따뜻한 결말, 현실적 부모/자녀 관계, 위로",
        "hates": "선정적 장면, 자녀에게 보이기 어려운 가치관, 신파 강요",
        "voice_tone": "온화하지만 분명. 가족 시청 관점",
    },

    # ============ 40~50대 (가족·중장년) ============
    {
        "id": "40F_family",
        "name": "40대 가정주부·직장인 / 가족극·일일극·로맨스 멜로",
        "age": "40~50",
        "gender": "여",
        "location": "전국",
        "occupation": "주부/직장인, 자녀 청소년",
        "preference": "가족극·일일극·로맨스 멜로·요리/여행 예능",
        "consumption": "공중파 본방사수, 케이블, 일부 OTT (자녀 추천)",
        "loves": "가족 화합, 인생의 위로, 알아볼 만한 일상",
        "hates": "너무 어두움, 폭력적, 비도덕적 캐릭터",
        "voice_tone": "정 많고 진심. '아이고 이 캐릭터 안쓰러워'",
    },
    {
        "id": "50F_drama_lover",
        "name": "50대 드라마 애호가 / 정통 멜로·일일극·사극",
        "age": "50~60",
        "gender": "여",
        "location": "전국",
        "occupation": "주부/자영업/은퇴",
        "preference": "정통 드라마·일일극·아침드라마·사극",
        "consumption": "TV 본방, 닫방, 케이블 재방송",
        "loves": "정통 멜로, 가족 갈등, 권선징악, 명배우 연기",
        "hates": "OTT스러운 짧은 호흡, 영어식 표현, 비속어 과다",
        "voice_tone": "직설적이고 사람 냄새. '이건 우리 어머니 세대도 안 봐'",
    },
    {
        "id": "50M_serious",
        "name": "50대 남성 시사·정통극 / 다큐·정치극·전쟁·사극",
        "age": "48~58",
        "gender": "남",
        "location": "도시",
        "occupation": "임원/자영업",
        "preference": "시사 다큐·정치극·스릴러·전쟁·사극",
        "consumption": "TV 정시 시청, 신문 구독, 책",
        "loves": "사회 의식, 깊이 있는 캐릭터, 역사적 무게",
        "hates": "가벼운 코미디, 신파, 트렌디한 척",
        "voice_tone": "권위적/진중. '주제가 너무 가볍다'",
    },

    # ============ 마니아·전문가 ============
    {
        "id": "writer_critic",
        "name": "작가형 평론가 (30~40대, 구조적 완성도 깐깐)",
        "age": "30~45",
        "gender": "무관",
        "location": "서울",
        "occupation": "작가/평론가/방송 PD",
        "preference": "구조적 완성도·작가의 시그니처·문체",
        "consumption": "평론 매체, 독립영화, 문학",
        "loves": "정교한 구성, 서브텍스트, 작가의 의도",
        "hates": "클리셰, 작가가 게으름, AI 티 나는 대사",
        "voice_tone": "전문적. humanizer 6패턴 직접 지적",
    },
    {
        "id": "industry_pd",
        "name": "방송사 PD / 편성 책임자 (시청률·시장성·예산)",
        "age": "35~50",
        "gender": "무관",
        "location": "서울",
        "occupation": "PD/배급사 편성",
        "preference": "시청률·시장성·제작 가능성·예산 효율",
        "consumption": "경쟁작 모니터링, 시청률 데이터",
        "loves": "후크 강함, 회차 구성 안정, 출연자 캐스팅 가능성",
        "hates": "제작비 과다, 캐스팅 어려움, 후반부 처짐",
        "voice_tone": "현실적. '편성은 어려울 듯' '예산 X'",
    },

    # ============ 글로벌 ============
    {
        "id": "global_kfan",
        "name": "글로벌 한류팬 (영문권 20~35)",
        "age": "20~35",
        "gender": "여",
        "location": "북미/유럽/동남아",
        "occupation": "회사원/대학원생",
        "preference": "K-드라마·K-팝·한국 영화·웹툰 영문판",
        "consumption": "Netflix·Crunchyroll·Webtoon·라인망가",
        "loves": "한국 특유의 감정선, 가족 관계, 문화적 디테일",
        "hates": "너무 한국적이라 이해 안 되는 맥락, 영어 자막 부자연스러움",
        "voice_tone": "글로벌 시각. '이 부분은 자막 번역이 어려울 듯'",
    },
    {
        "id": "japan_otaku",
        "name": "일본 애니/웹툰 팬 (20~40대)",
        "age": "20~40",
        "gender": "남",
        "location": "도쿄/오사카",
        "occupation": "회사원/덕후",
        "preference": "애니·만화·라이트노벨·세카이계",
        "consumption": "단행본, 라프텔, 일본 OTT",
        "loves": "정밀한 세계관, 캐릭터 아크, 아니메 클리셰 활용",
        "hates": "한국 정서 너무 강함, 이해 안 되는 가족 관계",
        "voice_tone": "정중하지만 깐깐. 아니메 비교",
    },

    # ============ 특수 타겟 ============
    {
        "id": "rural_30M",
        "name": "30대 지방 남성 / 예능·일상물·실용 다큐",
        "age": "30~40",
        "gender": "남",
        "location": "지방 중소도시/시골",
        "occupation": "자영업/공무원/농업",
        "preference": "예능·코미디·낚시/캠핑·일상물·실용 다큐",
        "consumption": "TV 위주, 유튜브, 일부 OTT",
        "loves": "공감, 실생활 가까움, 진짜 사람 같은 캐릭터",
        "hates": "도시 잘난 척, 비현실적 부유함, 너무 트렌디",
        "voice_tone": "느긋하고 솔직. 도시 시각에 비판적",
    },
    {
        "id": "20M_director_track",
        "name": "20대 후반 영상 전공자 / 독립영화·작가주의",
        "age": "25~30",
        "gender": "남",
        "location": "서울",
        "occupation": "영상 학과 학생/조감독/연출 지망",
        "preference": "독립영화·작가주의·일본/유럽 영화·시네마틱",
        "consumption": "영화제, 시네마테크, 독립영화관",
        "loves": "비주얼/연출, 구조적 실험, 작가의 시그니처",
        "hates": "상업성만 있는 작품, 안일한 연출",
        "voice_tone": "예술적/비평적. 연출 디테일 지적",
    },
    {
        "id": "kidult",
        "name": "30대 키덜트 / 캐릭터 IP·굿즈·전시·콜라보",
        "age": "28~38",
        "gender": "여",
        "location": "도시",
        "occupation": "직장인/프리랜서",
        "preference": "캐릭터 IP·굿즈·전시·콜라보·디즈니/지브리 풍",
        "consumption": "전시 관람, 굿즈 수집, 콜라보 카페",
        "loves": "사랑스러운 캐릭터, 굿즈로 만들고 싶음, 디테일",
        "hates": "캐릭터 매력 없음, 굿즈로 안 됨, 시각적 매력 X",
        "voice_tone": "밝고 디테일. 굿즈 가능성 평가",
    },

    # ============ 일반 시청자 (편하게) ============
    {
        "id": "casual_30s",
        "name": "30대 평범한 시청자 / 로코·잔잔한 드라마·예능",
        "age": "28~40",
        "gender": "여",
        "location": "전국",
        "occupation": "회사원/주부",
        "preference": "예능·로코·잔잔한 드라마·요리/먹방",
        "consumption": "본방사수+주말 OTT, 웹툰 자투리",
        "loves": "편하게 볼 만함, 부담 없는 결말, 캐릭터 사랑스러움",
        "hates": "어두움, 머리 써야 함, 결말 찝찝",
        "voice_tone": "편하게. '재밌긴 한데 좀 어렵네'",
    },
    {
        "id": "casual_40s",
        "name": "40대 일반 남성 / 스포츠·다큐·예능·범죄 드라마",
        "age": "38~48",
        "gender": "남",
        "location": "전국",
        "occupation": "회사원/자영업",
        "preference": "스포츠 중계·다큐·예능·범죄 드라마",
        "consumption": "TV 본방, OTT 가끔, 주말 영화",
        "loves": "현실적, 묵직, 권선징악",
        "hates": "신파, 답답한 전개, 어른답지 않은 어른",
        "voice_tone": "솔직 + 짧음. '재미없네' 한 줄",
    },
]


def list_all() -> list[dict]:
    return list(REVIEWERS)


def get_by_id(reviewer_id: str) -> dict:
    for r in REVIEWERS:
        if r["id"] == reviewer_id:
            return r
    return None


def recommend_for_genre(genre_letter: str, limit: int = 4) -> list[dict]:
    """매체 + 장르에 따라 자동 추천 리뷰어 (3~4명 기본)"""
    # 매체별 핵심 타겟 매핑
    presets = {
        "A": ["30F_office_seoul", "40F_family", "30M_office_seoul", "50F_drama_lover"],   # TV 드라마
        "B": ["30F_office_seoul", "30M_office_seoul", "global_kfan", "20M_director_track"],  # 영화
        "C": ["30F_office_seoul", "40F_family", "20F_university_trend", "global_kfan"],   # 숏드라마
        "D": ["20F_university_trend", "kidult", "casual_30s", "japan_otaku"],              # 극장 애니
        "E": ["10M_gamer", "20M_otaku", "kidult", "casual_30s"],                           # 애니 시리즈
        "F": ["20F_university_trend", "10F_seoul_webtoon", "30F_office_seoul", "global_kfan"],  # 웹툰
        "G": ["50M_serious", "30M_office_seoul", "writer_critic", "casual_40s"],          # 다큐
        "H": ["10M_gamer", "20M_otaku", "20F_university_trend", "30F_office_seoul"],     # 웹소설
        "I": ["30F_office_seoul", "writer_critic", "20F_university_trend", "kidult"],    # 뮤지컬
        "J": ["20F_university_trend", "10F_seoul_webtoon", "casual_30s", "kidult"],      # 유튜브
        "K": ["kidult", "20F_university_trend", "30F_office_seoul", "industry_pd"],      # 전시
        "L": ["10M_gamer", "20M_otaku", "japan_otaku", "30M_office_seoul"],              # 게임
        "M": ["casual_30s", "casual_40s", "rural_30M", "20F_university_trend"],          # 예능
    }
    ids = presets.get(genre_letter, ["30F_office_seoul", "30M_office_seoul", "casual_30s", "global_kfan"])
    return [get_by_id(i) for i in ids[:limit] if get_by_id(i)]


def to_target_dict(reviewer: dict) -> dict:
    """build_targeted_review_prompt에 넘길 형태로 변환"""
    return {
        "name": reviewer["name"],
        "age": reviewer["age"],
        "lifestyle": f"{reviewer['location']} · {reviewer['occupation']}",
        "preference": reviewer["preference"],
        "consumption": reviewer["consumption"],
        "loves": reviewer["loves"],
        "hates": reviewer["hates"],
        "voice_tone": reviewer["voice_tone"],
    }
