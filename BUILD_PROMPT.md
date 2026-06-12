# Build Prompt — "Daily Brief" Obsidian 플러그인

> 이 문서는 다른 AI 코딩 에이전트에게 그대로 전달해 플러그인을 처음부터 재현하기 위한 **자립형 빌드 명세**입니다. 위에서 아래로 구현하세요. 각 단계 끝에서 `npm run build`가 통과해야 합니다.

---

## 0. 미션 (한 문장)

매일 아침, 흩어진 정보(캘린더 일정 · GitHub PR/이슈 · 내 미션 학습노트 · CS 개념)를 모아 **Obsidian 데일리 노트의 "오늘 할일" 섹션에 자동으로 정리**해 넣는 데스크톱 전용 플러그인을 만든다. 백엔드 개발 학습자(우아한테크코스 수강생)를 1차 사용자로 가정하되, 설정으로 일반화 가능해야 한다.

## 1. 기술 스택 / 프로젝트 셋업

- **언어/번들러**: TypeScript + esbuild (CommonJS, `main.js` 단일 산출물)
- **타깃**: Obsidian Plugin API (`obsidian` 패키지), `isDesktopOnly: true`
- **런타임 의존성**: `ical.js`(^2) — ICS 파싱. 그 외는 Obsidian 내장/Node 빌트인.
- **네트워크 호출은 전부 `requestUrl`(obsidian)** 로 — `fetch` 금지 (CORS 회피).
- 빌드: `tsc -noEmit -skipLibCheck && esbuild`. `strict: true`.
- 산출 파일: `manifest.json`, `main.js`, (선택)`styles.css`. `main.js`·`data.json`·`node_modules`·`.omc/`는 `.gitignore`.

`manifest.json`:
```json
{
  "id": "daily-brief",
  "name": "Daily Brief",
  "version": "0.0.1",
  "minAppVersion": "1.4.0",
  "description": "GitHub, 내 학습 노트, 보관함 개념 노트를 모아 오늘의 할일을 데일리 노트에 정리합니다.",
  "author": "<your-handle>",
  "isDesktopOnly": true
}
```

esbuild는 `obsidian`/`electron`/CodeMirror 모듈과 Node 빌트인을 external 처리하고 `ical.js`는 번들에 포함.

## 2. 핵심 아키텍처 — "소스(Source)" 플러그인 패턴

모든 정보 출처를 동일 인터페이스로 추상화한다. 새 출처 추가가 곧 새 `BriefSource` 한 개 추가.

```ts
// types.ts
export interface BriefItem {
  text: string;       // 마크다운 한 줄 (링크/체크박스 허용)
  priority?: number;  // 작을수록 위. 섹션 내 정렬에 사용 (stable sort)
  due?: string;
  key?: string;       // 중복 방지용
}
export interface BriefSection {
  title: string;
  emoji: string;
  items: BriefItem[];
  emptyText?: string; // 비었을 때 표시 문구. items=[] 이고 emptyText 없으면 섹션 자체를 숨김
}
export interface BriefSource {
  collect(): Promise<BriefSection>;
}
```

**메인 플로우 (`main.ts`, `Plugin` 상속):**
1. 명령어 등록: `오늘의 브리프 갱신`, `오늘 데일리 노트 열기`, `AI: 다음 학습 추천`. 리본 아이콘(`calendar-check`)도 갱신에 연결.
2. `오늘의 브리프 갱신`:
   - 오늘 데일리 노트 파일을 보장 생성 (`<folder>/<YYYY-MM-DD>.md`). **H1 제목은 넣지 않음** (파일명과 중복). 본문은 `## <섹션 헤딩>\n`만.
   - 소스들을 **순서대로** `collect()` (각 소스 실패는 잡아서 오류 섹션으로). 순서 = Calendar → GitHub → GitHubNotes → CS → Concept(질문) → ConceptNote(개념).
   - 렌더링 → 데일리 노트의 마커 영역만 교체 (아래 렌더러).
   - 노트를 활성 리프에 연다. `Notice`로 진행/완료 표시.
3. 설정 로드/저장: `Object.assign({}, DEFAULT_SETTINGS, await loadData())` / `saveData`.

## 3. 렌더러 (`renderer.ts`) — 마커 기반 멱등 삽입

데일리 노트의 사용자 본문을 건드리지 않도록, 자동 생성 영역을 HTML 주석 마커로 감싼다.

- `renderSections(sections)`: 섹션→마크다운. `items=[]`이고 `emptyText` 없으면 섹션 생략. items는 `priority` 오름차순(동률은 삽입순 유지)으로 정렬 후 `- ${text}`.
- `upsertSection(existing, heading, body, now)`:
  - 마커 `<!-- daily-brief:begin -->` ~ `<!-- daily-brief:end -->`가 있으면 그 안만 교체.
  - 없으면 `## <heading>` 바로 아래에 삽입. 헤딩도 없으면 문서 끝에 새 섹션 추가.
  - 본문 상단에 `_업데이트: YYYY-MM-DD HH:mm_` 스탬프.
- `upsertAiSection(existing, body, now)`: AI 추천 전용 별도 마커(`daily-brief:ai:begin/end`) + `### 🤖 AI 학습 추천`.
- `formatDateForFilename(d, "YYYY-MM-DD")` 헬퍼.

## 4. 설정 (`settings.ts`) — `PluginSettingTab`

`DailyBriefSettings` 인터페이스 + `DEFAULT_SETTINGS` + UI. 비밀 값(토큰/키)은 `inputEl.type="password"`. 섹션별 헤딩으로 그룹.

| 그룹 | 필드 (기본값) |
|---|---|
| 데일리 노트 | `dailyNoteFolder("")` · `dailyNoteDateFormat("YYYY-MM-DD")` · `sectionHeading("오늘 할일")` |
| GitHub | `githubEnabled(false)` · `githubToken("")` · `githubUsername("")` · `githubActiveDays(14)` |
| 캘린더 | `calendarEnabled(false)` · `calendarIcsUrl("")` · `calendarMaxEvents(15)` |
| CS 학습 | `csEnabled(true)` · `currentMission("room-escape-reservation")` |
| 내 미션 노트 | `ghNotesEnabled(true)` · `notesRepo("")` · `notesBranch("main")` |
| 개념노트 갭분석 | `conceptScanEnabled(true)` · `conceptFolder("")` · `conceptTag("")` · `thinNoteBytes(400)` · `reviewTag("복습")` · `csQuestionsPerDay(2)` |
| 오늘의 CS 개념 | `gyoogleEnabled(true)` · `gyoogleFolder("CS 개념")` · `gyooglePerDay(1)` |
| AI | `aiBackend("cli")` · `claudeCliPath("claude")` · `anthropicApiKey("")` · `aiModel("claude-opus-4-8")` |

## 5. 데이터 (`cs-knowledge.ts`, `cs-backend.ts`)

### 5-1. 미션 CS 지식베이스 (`cs-knowledge.ts`)
- `CsRef { label, url }`, `REPOS` 상수(한국 CS 면접 레포 8종: gyoogle, ksundong/backend-interview-question, Seogeurim/CS-study, WeareSoft/tech-interview, JaeYeopHan/Interview_Question_for_Beginner, minnsane/TeachYourselfCS-KR, devSquad-study/2023-CS-Study 등).
- `CsTopic { id, title, why, task, refs, keywords?, sites?, questions?, hint? }`.
- `Mission { id, label, summary, topics, notesPrefix? }`.
- `MISSIONS`: 최소 `room-escape-reservation`(방탈출 예약, Spring 웹)을 7주제로 채운다 — **동시성/중복예약 락, 트랜잭션·격리수준, HTTP 메서드·상태코드, REST 설계, 인증/인가, 계층형 아키텍처, DB 인덱스·정규화**. 각 주제에 `keywords`(갭 매칭용), `sites`(MDN/Wikipedia/jwt.io 등 공식 문서 — 괄호 포함 URL은 `%28/%29` 인코딩), `questions`(2~3개 인터뷰 질문), `hint`(한 줄). 다른 미션(자동차경주/블랙잭/체스)은 간단 스텁.
- `findMission(id)`.

### 5-2. 백엔드 CS 풀 (`cs-backend.ts`)
- `gyoogle/tech-interview-for-developer`(브랜치 `master`, MIT) 기반.
- `BackendTopic { id, category, title, path }` 약 65개 — 자료구조/알고리즘/OS/DB/네트워크/Java/Spring/디자인패턴/SW공학만. **프론트(React/CSR/PWA)·C/C++/JS·모바일 제외.**
- `path`는 레포 내 실제 `.md` 경로 (공백·`&`·`[]`·한글·오타 그대로; 예 `PCB & Context Switcing.md`). `gyoogleUrl(path)`는 세그먼트별 `encodeURIComponent` 후 GitHub blob URL 생성.

## 6. 소스 구현 (`sources/*.ts`)

각각 `BriefSource`. 비활성/미설정이면 `{items:[], emptyText 없음}`으로 숨김.

1. **`calendar.ts` (📅 오늘 일정)**: `calendarIcsUrl`(Google "iCal 형식의 비공개/공개 주소")을 `requestUrl`로 fetch. **응답에 `BEGIN:VCALENDAR` 없으면** "embed URL이 아니라 .ics 주소를 넣으라"는 친절한 에러. `ical.js`로 파싱: 비반복은 오늘 범위와 겹치면, 반복(RRULE)은 `Event.iterator()`로 오늘까지 전개(`occStart >= dayEnd`면 중단, guard 5000). 종일/시간 구분, 종일 먼저·시작시각 순. `오늘 일정이 없습니다` empty.

2. **`github.ts` (💻 GitHub)**: GitHub Search API(`requestUrl`, 토큰 있으면 Bearer)로 3종: 리뷰 요청받은 PR(`review-requested:<user>`), **내 PR(`author:<user>` + `updated:>=<오늘-githubActiveDays>` — 오래된 제출 PR 노이즈 제거)**, 할당 이슈(`assignee:<user>`). `[제목](url) — owner/repo`.

3. **`githubNotes.ts` (🗂️ 내 미션 노트)**: `notesRepo`의 git tree(`requestUrl`)에서 `mission.notesPrefix`로 필터. README들의 `- [x]`/`- [ ]`를 세어 진행률. **진행 중일 때만 표시** (`total>0 && done<total`; 100%/요구사항없음이면 섹션 숨김). + `study-log/*.md` 최신 3개 링크. blob/raw URL은 경로 세그먼트 인코딩.

4. **`cs.ts` (🎓 CS 학습)**: 현재 미션의 "오늘의 주제" 1개만 (날짜 `dayOfYear % topics.length` 회전). `왜/오늘 할일/참고`(참고는 `sites`+`refs` 결합 최대 3개).

5. **`concept.ts` (📚 오늘의 CS 질문)** + **`learning.ts`**:
   - `learning.ts`: `collectConceptNotes(app, settings, excludePath)` — `conceptFolder`(빈값=전체)/`conceptTag` 필터, `metadataCache`로 태그·헤딩, `file.stat.size`. `analyzeGaps(notes, missionId, settings)` — 미션 주제 키워드 ↔ 노트(제목+헤딩+태그) 매칭으로 covered/uncovered, thin(작은 노트), review(태그). **키워드 매칭**: ASCII 키워드는 단어경계(`\b`)로(`rest`가 `RestControllerAdvice`에 안 걸리게), 한글은 부분일치.
   - `concept.ts`: uncovered(없으면 covered) 풀에서 **매일 회전**(`(dayOfYear*n) % pool.length`)으로 `csQuestionsPerDay`개 선택. 각: `❓ 질문` + `↳ 💡 힌트` + `↳ 📎 링크` + `- [ ] OO 노트로 정리하기` 체크박스. 헤더에 진행률.

6. **`conceptNote.ts` (📖 오늘의 CS 개념)** — **핵심 기능**:
   - 매일 `cs-backend.ts` 풀에서 회전 선택(`(dayOfYear*gyooglePerDay) % len`).
   - 원문 `.md`를 `raw.githubusercontent.com`에서 fetch → **`gyoogleFolder`에 개념 노트 생성** (이미 있으면 덮어쓰지 않음 — 사용자 정리 보존).
   - 노트 구성: frontmatter(`source`/`origin`/`category`/`created`/`tags: [cs-개념]`) → `> [!quote] 출처 …(MIT)` → **정리된 본문** → `## ✅ 확인 질문`(원문 헤딩 기반 체크박스) → `## ✍️ 내 정리`(빈 섹션).
   - **`cleanMarkdown(md)`**: `<br>` 제거 / 첫 `# 제목` 제거 / 헤딩 승격(가장 얕은 헤딩→`##`) / 연속 빈 줄 3+→1. **코드펜스 안은 보존**.
   - **`fixRelativeImages`**: 상대경로 이미지(`![]()`/`<img src>`)를 raw 절대경로로 보정.
   - **확인 질문 추출**: 원문 `##~####` 헤딩(코드펜스 밖, `참고/출처/예제/기타` 류 제외). 없으면 일반 질문 폴백.
   - 브리프에는 `📖 [category] title → [[노트]]` + 확인 질문 체크박스 3개.

## 7. AI 추천 (`ai.ts`) — 명령어 `AI: 다음 학습 추천`

학습 정도(갭) 기반으로 "다음에 뭘 공부할지" 3가지를 LLM이 추천. **두 백엔드:**
- **`cli` (기본, 구독 사용 · 무료)**: 로컬 `claude` CLI를 `child_process.execFile`로 헤드리스 호출 — `claude -p "<userContent>" --model <model> --system-prompt "<SYSTEM>" --disallowedTools "Bash Edit Write Read Glob Grep WebFetch WebSearch" --output-format text`, `cwd=os.tmpdir()`(프로젝트 컨텍스트 오염 방지). stdout이 `not logged in`류면 친절한 에러. (Claudian이 쓰는 방식 = Claude Code CLI는 Pro/Max 구독 로그인 사용 → API 키 불필요.)
- **`api` (종량제)**: Anthropic Messages API를 `requestUrl`로 직접 호출 (`x-api-key`, `anthropic-version: 2023-06-01`). 모델 `claude-opus-4-8`. 안정적 system 프롬프트에 `cache_control: ephemeral`(프롬프트 캐싱 구조). thinking 생략 + "최종 답만" 지시.

**컨텍스트(`buildAiContext`)**: 미션 라벨 · uncovered/covered 주제 · thin 노트(심화 후보) · 노트 제목 목록 · **주제별 큐레이션 URL 목록**. SYSTEM 프롬프트: "제공된 링크만 사용, URL 지어내지 말 것", "노트 없는 주제 먼저 → 얕은 노트는 심화 → 충분한 건 제외", "한국어 마크다운 3줄". 결과는 `upsertAiSection`으로 데일리 노트에 삽입.

## 8. 수용 기준 (Acceptance)

- [ ] `npm run build` 통과 (tsc strict + esbuild).
- [ ] 보관함에 설치 후 `오늘의 브리프 갱신` 실행 시 데일리 노트의 `## 오늘 할일` 아래 마커 영역에 활성화된 섹션들이 생성/갱신되고, 마커 밖 본문은 보존된다.
- [ ] 두 번째 실행해도 마커 영역만 교체된다(멱등). 비활성/빈 소스는 섹션이 숨겨진다.
- [ ] 캘린더: 잘못된(embed) URL엔 친절한 에러, 올바른 ICS엔 종일·시간·반복 일정이 정확히 오늘만 표시.
- [ ] GitHub: 토큰 없이도 동작(rate limit 낮음), 내 PR은 최근 N일만.
- [ ] 📖 개념: gyoogle 원문이 `CS 개념/`에 가독성 정리된 노트로 생성(출처·확인질문·내정리 포함), 이미 있으면 덮어쓰지 않음.
- [ ] `AI: 다음 학습 추천`: cli 백엔드로 API 키 없이 동작(로컬 claude 로그인 시).

## 9. 구현 순서 (권장)

1. 셋업(manifest/package/tsconfig/esbuild) + `types.ts` + `renderer.ts` + `main.ts` 뼈대 → 빌드 통과
2. `settings.ts`(데일리 노트만) + GitHub 소스 → 데일리 노트에 1개 섹션
3. `cs-knowledge.ts` + `cs.ts` + `learning.ts` + `concept.ts`
4. `githubNotes.ts`
5. `calendar.ts` (+ `ical.js`)
6. `cs-backend.ts` + `conceptNote.ts` (개념 노트 생성)
7. `ai.ts` (cli/api 백엔드) + 명령어

> 비밀(토큰/ICS/API 키)은 절대 코드/커밋에 넣지 말 것. 전부 설정(`data.json`, gitignore)으로만.
