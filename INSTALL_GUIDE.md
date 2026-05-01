# SUNNY Story Maker — 수동 설치 가이드 (맥북)

> 자동 설치(`setup_mac.command` 더블클릭)가 안 됐을 때 이 가이드를 따라하세요.
> 5분이면 끝나요.

## 1. Python 설치 (이미 있으면 건너뛰기)

터미널 열기: `Cmd + Space` → "터미널" 입력 → 엔터

다음 입력:
```
python3 --version
```

- `Python 3.10` 이상 나오면 → 다음 단계로
- `command not found` 나오면 → 아래 둘 중 하나로 설치:

### 방법 A. 공식 사이트 (가장 쉬움)
1. https://www.python.org/downloads/macos/ 접속
2. 노란 큰 버튼 "Download Python 3.x" 클릭
3. 다운로드된 `.pkg` 파일 더블클릭 → 설치 진행
4. 설치 끝나면 터미널에서 `python3 --version` 다시 확인

### 방법 B. Homebrew (개발자 도구에 익숙하면)
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python3
```

## 2. 폴더 이동

압축 푼 폴더로 이동. 예를 들어 다운로드 폴더라면:
```
cd ~/Downloads/sunny-story-maker
```

(폴더명은 본인 압축 푼 위치에 맞게 바꿔주세요)

## 3. 가상환경 생성

```
python3 -m venv venv
source venv/bin/activate
```

`(venv)`가 프롬프트 앞에 붙으면 성공.

## 4. 라이브러리 설치

```
pip install --upgrade pip
pip install -r requirements.txt
```

1~3분 정도 걸려요. "Successfully installed..." 나오면 끝.

## 5. .env 파일 만들기

```
cp .env.example .env
```

(또는 같은 폴더에서 `.env.example`을 복사 → 이름을 `.env`로 변경)

## 6. 실행

```
streamlit run app.py
```

브라우저가 자동으로 열림. 안 열리면 http://localhost:8501 직접 입력.

## 7. API 키 입력

1. 우측 상단 `ADMIN` 클릭
2. `시스템` 탭
3. `API 키` 칸에 박선희 대표가 카톡으로 보낸 키 붙여넣기
4. `💾 설정 저장` 클릭
5. 페이지 새로고침

## 8. 종료 / 재실행

- 종료: 터미널에서 `Ctrl + C`
- 다음 실행: `start_mac.command` 더블클릭 (또는 위 6번 명령 다시)

---

## 자주 생기는 문제

### "확인되지 않은 개발자" 경고로 .command 파일이 안 열림
1. `시스템 환경설정` → `개인정보 보호 및 보안` 들어가기
2. 아래쪽 "차단된 항목" 메시지 옆 `확인 없이 열기` 클릭
3. 파일 다시 더블클릭

또는: 파일 우클릭 → `열기` → `그래도 열기`

### `pip install`이 권한 오류로 실패
`venv` 활성화 안 된 상태일 가능성. 다음 다시 시도:
```
source venv/bin/activate
pip install -r requirements.txt
```
프롬프트 앞에 `(venv)` 표시 확인.

### `streamlit: command not found`
가상환경 비활성 상태. 다음 입력:
```
source venv/bin/activate
streamlit run app.py
```

### 브라우저가 안 열림
http://localhost:8501 을 사파리/크롬에 직접 입력.

### 8501 포트가 이미 사용 중
다른 포트로 실행:
```
streamlit run app.py --server.port 8502
```

---

## 그래도 막히면

박선희 대표에게 카톡으로 다음을 보내주세요:
1. 어느 단계에서 막혔는지 (위 1~6번)
2. 터미널에 뜬 빨간색 에러 메시지 스크린샷
3. macOS 버전 (`사과 메뉴 → 이 Mac에 관하여`)
