# _archive — 옛 코드 보관소

> 글로벌 룰 17 — 옛 작업 = 항상 보존. 삭제 X. `_archive/`로만.

## 2026-05-20 — V3.1 G6 정리

### `lib_db/` (옛 lib/db/)
- `artifacts.ts·chat.ts·lessons.ts·profiles.ts·projects.ts·types.ts·versions.ts`
- 사유: V2 시절 Supabase 직접 호출 wrapper. V2.13+ = streamAgent + localStorage·workConversation 모델로 전환되면서 아무 곳에서도 import X.
- 복구: `git mv _archive/lib_db/* lib/db/` 또는 `lib/db/` 폴더 복원.
- 검증 (정리 전): `grep -rE "@/lib/db" --include="*.ts" --include="*.tsx"` = 0 hit.

## 복구 룰

옛 코드가 다시 필요해지면 = 이 폴더에서 가져와 적절한 위치로 `git mv`.
**삭제 X = 글로벌 룰 17 (= 누가 박았든 옛 작업 보존).**
