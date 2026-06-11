# Daily Brief

GitHub, 내 학습 노트(인덱스 레포), 보관함 개념 노트, 미완료 작업을 한데 모아 **오늘의 할일**을 옵시디언 데일리 노트에 자동으로 정리해 주는 플러그인입니다. 우아한테크코스 미션 학습 흐름에 맞춰 만들었지만, 설정으로 일반적인 용도에도 쓸 수 있습니다.

> ⚠️ 데스크톱 전용 (`isDesktopOnly`). GitHub/Claude CLI 호출 때문에 데스크톱에서만 동작합니다.

## 기능

데일리 노트의 지정 헤딩 아래(마커 영역)에 다음 섹션을 만들어 갱신합니다. 마커 밖 본문은 건드리지 않습니다.

| 섹션 | 내용 | 출처 |
|---|---|---|
| 📅 오늘 일정 | 오늘 캘린더 일정 (종일/시간/반복 일정 전개) | 비밀 ICS URL |
| 💻 GitHub | 리뷰 요청받은 PR · 최근 활동한 내 PR · 할당된 이슈 | GitHub REST |
| 🗂️ 내 미션 노트 | 미션 README 요구사항 진행률 · 최근 study-log 링크 | 인덱스 레포 |
| 🎓 CS 학습 | 현재 미션의 "오늘의 CS 주제"(날짜 로테이션) + 참고 레포 | 내장 큐레이션 |
| 📚 오늘의 CS 질문 | 갭 분석으로 아직 노트 없는 주제를 골라, 매일 회전하며 인터뷰식 질문 + 힌트 + 참고 링크 제시 | 보관함 |
| 🧠 CS 기초 | coding-interview-university 기반 CS 기본기(자료구조·알고리즘·OS·네트워크) 질문, 매일 회전 | 내장 |
| 🧩 백엔드 CS | gyoogle/tech-interview-for-developer의 백엔드 주제(DB·네트워크·OS·Java·Spring·디자인패턴 등)를 매일 하나씩, 원문 링크 첨부 | 내장 |
| 🤖 AI 학습 추천 | 위 정보를 바탕으로 LLM이 "다음에 뭘 공부할지" 추천 (명령으로 호출) | Claude |

## 명령어

- **오늘의 브리프 갱신** — 위 섹션들을 모아 데일리 노트에 삽입/갱신
- **오늘 데일리 노트 열기**
- **AI: 다음 학습 추천** — `### 🤖 AI 학습 추천` 블록 생성

리본의 📅 아이콘으로도 브리프 갱신을 실행할 수 있습니다.

## AI 백엔드 (두 가지)

| 백엔드 | 결제 | 필요한 것 |
|---|---|---|
| **구독 (Claude CLI)** — 기본 | 없음 (구독 사용) | 로컬에 로그인된 [`claude` CLI](https://docs.claude.com/claude-code) |
| API 키 (종량제) | 토큰당 과금 | `console.anthropic.com` 의 Anthropic API 키 |

구독 백엔드는 `claude` CLI를 헤드리스로 호출하므로 API 키·추가 결제 없이 동작합니다. CLI를 PATH에서 못 찾으면 설정에서 절대경로(예: `/opt/homebrew/bin/claude`)를 지정하세요.

## 설치 (수동)

릴리스가 아직 없으므로 소스에서 빌드합니다.

```bash
git clone https://github.com/K-iise/obsidian-daily-brief.git
cd obsidian-daily-brief
npm install
npm run build            # main.js 생성
```

빌드된 `main.js`, `manifest.json`(필요시 `styles.css`)을 보관함의
`<vault>/.obsidian/plugins/daily-brief/` 로 복사하거나, 개발 중이라면 심볼릭 링크:

```bash
ln -s "$(pwd)" "<vault>/.obsidian/plugins/daily-brief"
```

이후 옵시디언 설정 → 커뮤니티 플러그인에서 **Daily Brief** 활성화.

## 개발

```bash
npm run dev        # esbuild watch (코드 수정 시 자동 빌드)
npm run build      # 타입체크 + 프로덕션 번들
```

## 설정 요약

- **데일리 노트**: 폴더 / 파일명 날짜 형식 / 갱신 대상 헤딩
- **캘린더**: 비밀 ICS URL (Google Calendar의 비공개 iCal 주소) — OAuth 불필요, 읽기 전용
- **GitHub**: 사용자명 · PAT · 내 PR 활동 기간(일)
- **내 미션 노트**: 인덱스 레포(`owner/repo`) · 브랜치
- **CS 학습**: 현재 미션 선택
- **CS 기초**: coding-interview-university 기반 질문 on/off · 하루 개수
- **백엔드 CS**: gyoogle 기반 백엔드 주제 on/off · 하루 개수
- **개념노트 갭 분석**: 개념 폴더/태그(비우면 전체 스캔) · 복습 태그 · 얇은 노트 기준
- **AI**: 백엔드(구독 CLI / API 키) · CLI 경로 · API 키 · 모델

## 라이선스

[MIT](./LICENSE)
