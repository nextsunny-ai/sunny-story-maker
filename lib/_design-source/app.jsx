/* ============================================================
   App shell — Tweaks panel + screen router
   ============================================================ */

const { useState: useS, useEffect: useE } = React;
const TW = window.useTweaks;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tone": "B",
  "screen": "home",
  "displayFont": "Newsreader",
  "activeGenre": "none"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = TW(TWEAK_DEFAULTS);
  const [screen, setScreen] = useS(tweaks.screen || "home");

  useE(() => {
    document.documentElement.setAttribute('data-tone', tweaks.tone || 'A');
  }, [tweaks.tone]);

  useE(() => {
    if (tweaks.screen && tweaks.screen !== screen) setScreen(tweaks.screen);
  }, [tweaks.screen]);

  useE(() => {
    document.documentElement.style.setProperty(
      '--font-display',
      tweaks.displayFont === 'Pretendard'
        ? "'Pretendard', sans-serif"
        : tweaks.displayFont === 'Fraunces'
          ? "'Fraunces', 'Newsreader', 'Times New Roman', Georgia, serif"
          : "'Newsreader', 'Fraunces', 'Times New Roman', Georgia, serif"
    );
  }, [tweaks.displayFont]);

  const onNav = id => {
    setScreen(id);
    setTweak('screen', id);
  };

  // Expose nav globally so screens can deep-link to other screens
  useE(() => { window.__appNav = onNav; }, []);

  // Map sidebar items to screens we have built
  const screenMap = {
    login: 'login',
    home: 'home', pitch: 'pitch', package: 'package', write: 'write',
    review: 'review', chat: 'chat', library: 'library', admin: 'admin'
  };
  const activeNav = screenMap[screen] ? screen : 'home';

  // LOGIN — full-bleed, no sidebar
  if (activeNav === 'login') {
    const TweaksPanel  = window.TweaksPanel;
    const TweakSection = window.TweakSection;
    const TweakSelect  = window.TweakSelect;
    return (
      <React.Fragment>
        <window.LoginScreen />
        <TweaksPanel title="Tweaks">
          <TweakSection label="Screen">
            <TweakSelect
              label="화면 전환"
              value={tweaks.screen}
              onChange={v => setTweak('screen', v)}
              options={[
                { value: 'login',   label: '✨ 로그인' },
                { value: 'home',    label: '① 홈' },
                { value: 'pitch',   label: '② AI Pitch' },
                { value: 'package', label: '③ 기획 패키지' },
                { value: 'write',   label: '④ 집필' },
                { value: 'review',  label: '⑤ 리뷰' },
                { value: 'chat',    label: '⑥ 보조작가' },
                { value: 'library', label: '⑦ 라이브러리' },
                { value: 'admin',   label: '⑧ Admin' },
              ]}
            />
          </TweakSection>
        </TweaksPanel>
      </React.Fragment>
    );
  }

  let CurrentScreen;
  switch (activeNav) {
    case 'pitch':   CurrentScreen = window.PitchScreen;   break;
    case 'package': CurrentScreen = window.PackageScreen; break;
    case 'write':   CurrentScreen = window.WriteScreen;   break;
    case 'review':  CurrentScreen = window.ReviewScreen;  break;
    case 'chat':    CurrentScreen = window.ChatScreen;    break;
    case 'library': CurrentScreen = window.LibraryScreen; break;
    case 'admin':   CurrentScreen = window.AdminScreen;   break;
    default:        CurrentScreen = window.HomeScreen;
  }

  const TweaksPanel  = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakRadio   = window.TweakRadio;
  const TweakSelect  = window.TweakSelect;

  return (
    <React.Fragment>
      <div className="app">
        <Sidebar
          active={activeNav}
          onNav={onNav}
          activeGenre={tweaks.activeGenre && tweaks.activeGenre !== 'none' ? tweaks.activeGenre : null}
          onGenreChange={v => setTweak('activeGenre', v || 'none')}
        />
        <CurrentScreen />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Tone">
          <TweakRadio
            label="배경 톤"
            value={tweaks.tone}
            onChange={v => setTweak('tone', v)}
            options={[
              { value: 'A', label: 'White' },
              { value: 'B', label: 'Warm' },
              { value: 'C', label: 'Gray' },
            ]}
          />
        </TweakSection>

        <TweakSection label="Screen">
          <TweakSelect
            label="화면 전환"
            value={tweaks.screen}
            onChange={v => setTweak('screen', v)}
            options={[
              { value: 'login',   label: '✨ 로그인' },
              { value: 'home',    label: '① 홈' },
              { value: 'pitch',   label: '② AI Pitch' },
              { value: 'package', label: '③ 기획 패키지' },
              { value: 'write',   label: '④ 집필' },
              { value: 'review',  label: '⑤ 리뷰' },
              { value: 'chat',    label: '⑥ 보조작가' },
              { value: 'library', label: '⑦ 라이브러리' },
              { value: 'admin',   label: '⑧ Admin' },
            ]}
          />
        </TweakSection>

        <TweakSection label="Sidebar Mode">
          <TweakSelect
            label="활성 장르"
            value={tweaks.activeGenre}
            onChange={v => setTweak('activeGenre', v)}
            options={[
              { value: 'none', label: '— 공통 모드 —' },
              { value: 'A',    label: 'A. TV 드라마' },
              { value: 'B',    label: 'B. 영화' },
              { value: 'C',    label: 'C. 숏드라마' },
              { value: 'D',    label: 'D. 극장 애니' },
              { value: 'F',    label: 'F. 웹툰' },
              { value: 'G',    label: 'G. 다큐멘터리' },
              { value: 'H',    label: 'H. 웹소설' },
              { value: 'I',    label: 'I. 뮤지컬' },
              { value: 'J',    label: 'J. 유튜브' },
              { value: 'K',    label: 'K. 전시' },
              { value: 'L',    label: 'L. 게임' },
              { value: 'M',    label: 'M. 예능' },
            ]}
          />
        </TweakSection>

        <TweakSection label="Typography">
          <TweakRadio
            label="디스플레이 폰트"
            value={tweaks.displayFont}
            onChange={v => setTweak('displayFont', v)}
            options={[
              { value: 'Newsreader', label: 'Newsreader' },
              { value: 'Fraunces',   label: 'Fraunces' },
              { value: 'Pretendard', label: 'Pretendard' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
