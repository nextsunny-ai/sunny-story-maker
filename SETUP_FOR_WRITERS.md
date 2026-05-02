# SUNNY Story Maker — Mac 자동 셋업

## 한 번만 (5~10분)

1. ZIP 압축 풀기
2. `setup.command` 더블클릭

끝. 알아서:
- 의존성 설치 (npm install)
- 환경변수 자동 생성 (.env.local)
- 바탕화면 바로가기 생성 (Story_Maker.command)
- 브라우저에서 자동으로 열림 (http://localhost:3001)

## 첫 실행 시 Mac 보안 경고가 뜨면

"확인되지 않은 개발자" 경고 → **시스템 설정 → 개인정보 보호 및 보안 → "확인 없이 열기"** 허용 → 다시 더블클릭.

## 사용

- **시작**: 바탕화면 `Story_Maker.command` 더블클릭 (자동으로 브라우저 열림)
- **종료**: 떠있는 Terminal 창에서 `Ctrl+C` 또는 창 닫기
- **URL**: http://localhost:3001

## 사전 준비 (이미 다 갖춘 분이면 스킵)

- Claude Pro/Max 구독자 + Claude Code 로그인 완료 (`claude` 명령어 작동)
- Node.js 20+ (https://nodejs.org)

`setup.command` 실행 시 두 가지 다 확인하고 빠진 게 있으면 안내해줍니다.

## 비용

- Story Maker 자체 = $0
- AI 호출 = $0 (본인 Claude Pro/Max 구독 안에서 무료, API 비용 X)
- 데이터 저장 = $0 (베타 무료)

## 데이터

- 작품/버전/채팅/학습 = 클라우드 자동 저장
- 본인 작품만 본인이 봄 (writer_id 격리)
- 한글/워드 다운로드 = 본인 Mac에 저장

## 막힐 때

사장님께 카톡 + 화면 캡처.