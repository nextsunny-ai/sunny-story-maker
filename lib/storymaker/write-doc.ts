// V3.0 본문 데이터 모델 — WriteDoc + Block discriminated union (16매체 통합).
// V2.14의 Para[] 모델을 대체. 매 단계(0~6) 점진 도입. PROSE 그룹은 Para와 1:1 무손실.

export type MediumGroup =
  | "SCREENPLAY"   // A·B·C·D·E (드라마·영화·숏드라마·애니)
  | "STAGE"        // I·N (뮤지컬·연극)
  | "CUESHEET"     // G·J·M (다큐·유튜브·예능)
  | "PANEL"        // F (웹툰)
  | "PROSE"        // H·O·P (웹소설·소설·에세이)
  | "STRUCTURED";  // K·L (전시·게임)

const LETTER_TO_GROUP: Record<string, MediumGroup> = {
  A: "SCREENPLAY", B: "SCREENPLAY", C: "SCREENPLAY", D: "SCREENPLAY", E: "SCREENPLAY",
  F: "PANEL",
  G: "CUESHEET", J: "CUESHEET", M: "CUESHEET",
  H: "PROSE", O: "PROSE", P: "PROSE",
  I: "STAGE", N: "STAGE",
  K: "STRUCTURED", L: "STRUCTURED",
};

export function groupOf(letter: string): MediumGroup {
  return LETTER_TO_GROUP[letter] || "PROSE";
}

// ─── Block base (모든 블록 공통) ───
interface BlockBase {
  id: string;
  status: "done" | "streaming" | "pending";
  notes?: string;
}

// ─── 1. ProseBlock — PROSE 그룹 + 모든 그룹의 fallback (Para와 동형) ───
export interface ProseBlock extends BlockBase {
  kind: "prose";
  text: string;
  label?: string;
  chapterNo?: string;   // 소설 장 번호 (1·2·3…)
  episodeNo?: string;   // 웹소설 회차 (제01화·EP001)
}

// ─── 2. HeaderBlock — 회차헤더·장 명시 (PROSE + 다른 그룹 공통) ───
export interface HeaderBlock extends BlockBase {
  kind: "header";
  level: "episode" | "chapter" | "act" | "scene-group";
  title: string;
  number?: string;
}

// ─── 3. SceneHeadingBlock — SCREENPLAY 씬 헤딩 ───
export interface SceneHeadingBlock extends BlockBase {
  kind: "scene-heading";
  sceneNo?: string;
  place: string;
  time?: string;
  intExt?: "INT" | "EXT" | "INT/EXT";
}

// ─── 4. ActionBlock — 지문 ───
export interface ActionBlock extends BlockBase {
  kind: "action";
  text: string;
}

// ─── 5. DialogueBlock — 캐릭터 + 대사 (★ 대사 인라인 수정 대상) ───
export interface DialogueBlock extends BlockBase {
  kind: "dialogue";
  character: string;
  parenthetical?: string;
  text: string;
  effect?: boolean;
}

// ─── 6. MusicNumberBlock — STAGE 뮤지컬 ♪넘버 ───
export interface MusicNumberBlock extends BlockBase {
  kind: "music-number";
  numberNo?: string;
  numberTitle: string;
  lyrics: string;
}

// ─── 7. CueRowBlock — CUESHEET 시간축 행 ───
export interface CueRowBlock extends BlockBase {
  kind: "cue-row";
  timecode: string;
  cells: Record<string, string>;
}

// ─── 8. CutBlock — PANEL 웹툰 컷 ───
export interface CutBlock extends BlockBase {
  kind: "cut";
  cutNo: number;
  visual: string;
  dialogue?: string;
  sfx?: string;
  narration?: string;
}

// ─── 9. GameLineBlock — STRUCTURED 게임 대사 데이터 ───
export interface GameLineBlock extends BlockBase {
  kind: "game-line";
  lineId: string;
  character: string;
  text: string;
  condition?: string;
  nextId?: string;
  affinity?: string;
}

// ─── 10. ZoneBlock — STRUCTURED 전시 존 ───
export interface ZoneBlock extends BlockBase {
  kind: "zone";
  zoneNo: number;
  zoneName: string;
  area?: string;
  flow?: string;
  objects?: string;
  interactive?: string;
  docent?: string;
}

// ─── Block union ───
export type Block =
  | ProseBlock
  | HeaderBlock
  | SceneHeadingBlock
  | ActionBlock
  | DialogueBlock
  | MusicNumberBlock
  | CueRowBlock
  | CutBlock
  | GameLineBlock
  | ZoneBlock;

// ─── WriteDoc — 작품 1개 = 1 문서 ───
export interface WriteDoc {
  v: 3;
  group: MediumGroup;
  letter: string;
  blocks: Block[];
  cueColumns?: { key: string; label: string }[];
}

// ─── CUESHEET 매체별 컬럼셋 ───
export const CUE_COLUMNS: Record<string, { key: string; label: string }[]> = {
  G: [
    { key: "video", label: "영상" },
    { key: "audio", label: "오디오" },
    { key: "sub",   label: "자막" },
  ],
  J: [
    { key: "content", label: "내용" },
    { key: "sub",     label: "자막" },
  ],
  M: [
    { key: "corner", label: "코너" },
    { key: "cast",   label: "출연자" },
    { key: "vcr",    label: "VCR/스튜디오" },
    { key: "sub",    label: "자막 포인트" },
    { key: "mc",     label: "MC 진행 코멘트" },
  ],
};
