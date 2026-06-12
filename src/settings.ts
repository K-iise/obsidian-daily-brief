import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyBriefPlugin from "./main";
import { MISSIONS } from "./cs-knowledge";

export interface DailyBriefSettings {
  // GitHub
  githubEnabled: boolean;
  githubToken: string;
  githubUsername: string;
  githubActiveDays: number; // 내 PR: 최근 N일 내 활동만 표시

  // 데일리 노트
  dailyNoteFolder: string; // 예: "Daily" — 빈 문자열이면 보관함 루트
  dailyNoteDateFormat: string; // YYYY-MM-DD 등
  sectionHeading: string; // 데일리 노트 안에 삽입될 헤딩 (자동 갱신 대상)

  // 캘린더 (비밀 ICS URL)
  calendarEnabled: boolean;
  calendarIcsUrl: string;
  calendarMaxEvents: number;
  calendarTracks: string; // 쉼표 구분 트랙 코드(예: "BE"). "TRACK | 제목" 접두사로 필터. 빈값=전체

  // CS 학습
  csEnabled: boolean;
  currentMission: string; // cs-knowledge MISSIONS의 id

  // GitHub 학습노트 (인덱스 레포)
  ghNotesEnabled: boolean;
  notesRepo: string; // 예: "K-iise/woowacourse-8th"
  notesBranch: string; // 기본 main

  // 보관함 개념노트 갭 분석
  conceptScanEnabled: boolean;
  conceptFolder: string; // 비우면 전체 스캔
  conceptTag: string; // 비우면 태그 필터 없음 ('#' 제외)
  thinNoteBytes: number; // 이보다 작으면 '얇은 노트'
  reviewTag: string; // 복습 태그 ('#' 제외)
  csQuestionsPerDay: number; // 하루에 던질 CS 질문 개수

  // 오늘의 CS 개념 (gyoogle 원문 → 보관함 노트 생성)
  gyoogleEnabled: boolean;
  gyoogleFolder: string; // 개념 노트 저장 폴더
  gyooglePerDay: number;

  // AI 추천
  aiBackend: "cli" | "api"; // cli=구독(claude CLI), api=API 키
  claudeCliPath: string; // claude 실행 파일 경로
  anthropicApiKey: string;
  aiModel: string;
}

export const DEFAULT_SETTINGS: DailyBriefSettings = {
  githubEnabled: false,
  githubToken: "",
  githubUsername: "",
  githubActiveDays: 14,

  dailyNoteFolder: "",
  dailyNoteDateFormat: "YYYY-MM-DD",
  sectionHeading: "오늘 할일",

  calendarEnabled: false,
  calendarIcsUrl: "",
  calendarMaxEvents: 15,
  calendarTracks: "",

  csEnabled: true,
  currentMission: "room-escape-reservation",

  ghNotesEnabled: true,
  notesRepo: "K-iise/woowacourse-8th",
  notesBranch: "main",

  conceptScanEnabled: true,
  conceptFolder: "",
  conceptTag: "",
  thinNoteBytes: 400,
  reviewTag: "복습",
  csQuestionsPerDay: 2,

  gyoogleEnabled: true,
  gyoogleFolder: "CS 개념",
  gyooglePerDay: 1,

  aiBackend: "cli",
  claudeCliPath: "claude",
  anthropicApiKey: "",
  aiModel: "claude-opus-4-8",
};

export class DailyBriefSettingTab extends PluginSettingTab {
  plugin: DailyBriefPlugin;

  constructor(app: App, plugin: DailyBriefPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Daily Brief 설정" });

    // --- 데일리 노트 ---
    containerEl.createEl("h3", { text: "데일리 노트" });

    new Setting(containerEl)
      .setName("데일리 노트 폴더")
      .setDesc("비워두면 보관함 루트에 생성합니다. 예: Daily")
      .addText((t) =>
        t
          .setPlaceholder("Daily")
          .setValue(this.plugin.settings.dailyNoteFolder)
          .onChange(async (v) => {
            this.plugin.settings.dailyNoteFolder = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("파일명 날짜 형식")
      .setDesc("YYYY-MM-DD 권장")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.dailyNoteDateFormat)
          .onChange(async (v) => {
            this.plugin.settings.dailyNoteDateFormat = v.trim() || "YYYY-MM-DD";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("섹션 헤딩")
      .setDesc("데일리 노트 안에서 이 헤딩 아래 내용을 자동 갱신합니다.")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.sectionHeading)
          .onChange(async (v) => {
            this.plugin.settings.sectionHeading = v.trim() || "오늘 할일";
            await this.plugin.saveSettings();
          })
      );

    // --- GitHub ---
    containerEl.createEl("h3", { text: "GitHub" });

    new Setting(containerEl)
      .setName("GitHub 사용")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.githubEnabled).onChange(async (v) => {
          this.plugin.settings.githubEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("GitHub 사용자명")
      .setDesc("내 PR/이슈 찾을 때 사용")
      .addText((t) =>
        t
          .setPlaceholder("octocat")
          .setValue(this.plugin.settings.githubUsername)
          .onChange(async (v) => {
            this.plugin.settings.githubUsername = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("내 PR 활동 기간 (일)")
      .setDesc("최근 N일 내 활동된 내 PR만 표시합니다. (오래된 제출 PR 숨김)")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.githubActiveDays))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.githubActiveDays = isNaN(n) ? 14 : n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Personal Access Token")
      .setDesc(
        "github.com/settings/tokens 에서 발급. classic 토큰은 'repo, read:org' 또는 fine-grained 토큰의 Pull requests/Issues 읽기 권한."
      )
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("ghp_...")
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (v) => {
            this.plugin.settings.githubToken = v.trim();
            await this.plugin.saveSettings();
          });
      });

    // --- 캘린더 ---
    containerEl.createEl("h3", { text: "캘린더 (오늘 일정)" });

    new Setting(containerEl)
      .setName("캘린더 사용")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.calendarEnabled).onChange(async (v) => {
          this.plugin.settings.calendarEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("비밀 ICS URL")
      .setDesc(
        "Google Calendar → 설정 → 해당 캘린더 → '캘린더 통합' → 'iCal 형식의 비공개 주소'. 읽기 전용입니다."
      )
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("https://calendar.google.com/calendar/ical/.../basic.ics")
          .setValue(this.plugin.settings.calendarIcsUrl)
          .onChange(async (v) => {
            this.plugin.settings.calendarIcsUrl = v.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("최대 표시 개수")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.calendarMaxEvents))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.calendarMaxEvents = isNaN(n) ? 15 : n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("트랙 필터")
      .setDesc(
        "쉼표로 트랙 코드 입력(예: BE). 'BE | 제목'처럼 접두사가 붙은 일정만 필터합니다. 접두사 없는 일정은 항상 표시. 비우면 전체."
      )
      .addText((t) =>
        t
          .setPlaceholder("BE")
          .setValue(this.plugin.settings.calendarTracks)
          .onChange(async (v) => {
            this.plugin.settings.calendarTracks = v.trim();
            await this.plugin.saveSettings();
          })
      );

    // --- CS 학습 ---
    containerEl.createEl("h3", { text: "CS 학습" });

    new Setting(containerEl)
      .setName("CS 추천 사용")
      .setDesc("현재 미션에 맞는 CS 주제를 매일 추천합니다.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.csEnabled).onChange(async (v) => {
          this.plugin.settings.csEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("현재 미션")
      .setDesc("진행 중인 우테코 미션을 선택하면 그에 맞는 CS 주제가 나옵니다.")
      .addDropdown((d) => {
        for (const m of MISSIONS) d.addOption(m.id, m.label);
        d.setValue(this.plugin.settings.currentMission).onChange(async (v) => {
          this.plugin.settings.currentMission = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("내 미션 노트 참조 (GitHub 인덱스 레포)")
      .setDesc(
        "미션마다 정리해 둔 인덱스 레포의 README 요구사항과 study-log를 브리프에 끌어옵니다."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.ghNotesEnabled).onChange(async (v) => {
          this.plugin.settings.ghNotesEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("인덱스 레포")
      .setDesc("owner/repo 형식. 위 GitHub 토큰으로 접근합니다(비공개도 가능).")
      .addText((t) =>
        t
          .setPlaceholder("K-iise/woowacourse-8th")
          .setValue(this.plugin.settings.notesRepo)
          .onChange(async (v) => {
            this.plugin.settings.notesRepo = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("브랜치")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.notesBranch)
          .onChange(async (v) => {
            this.plugin.settings.notesBranch = v.trim() || "main";
            await this.plugin.saveSettings();
          })
      );

    // --- 개념노트 갭 분석 ---
    containerEl.createEl("h3", { text: "다음 학습 추천 (개념노트 갭 분석)" });

    new Setting(containerEl)
      .setName("개념 노트 갭 분석 사용")
      .setDesc("내 개념 노트와 미션 CS 주제를 대조해 아직 정리 안 한 주제를 추천합니다.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.conceptScanEnabled).onChange(async (v) => {
          this.plugin.settings.conceptScanEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("개념 노트 폴더")
      .setDesc("비우면 보관함 전체를 스캔합니다. 규칙을 정해뒀다면 폴더명 입력.")
      .addText((t) =>
        t
          .setPlaceholder("(전체)")
          .setValue(this.plugin.settings.conceptFolder)
          .onChange(async (v) => {
            this.plugin.settings.conceptFolder = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("개념 노트 태그")
      .setDesc("이 태그가 붙은 노트만 개념 노트로 봅니다. 비우면 태그 필터 없음. (# 제외)")
      .addText((t) =>
        t
          .setPlaceholder("개념")
          .setValue(this.plugin.settings.conceptTag)
          .onChange(async (v) => {
            this.plugin.settings.conceptTag = v.trim().replace(/^#/, "");
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("복습 태그")
      .setDesc("이 태그가 붙은 노트는 복습거리로 띄웁니다. (# 제외)")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.reviewTag)
          .onChange(async (v) => {
            this.plugin.settings.reviewTag = v.trim().replace(/^#/, "");
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("얇은 노트 기준 (bytes)")
      .setDesc("이 크기보다 작은 노트는 '보강 필요'로 표시합니다.")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.thinNoteBytes))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.thinNoteBytes = isNaN(n) ? 400 : n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("하루 CS 질문 개수")
      .setDesc("매일 회전하며 던질 질문 수 (아직 노트 없는 주제 우선).")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.csQuestionsPerDay))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.csQuestionsPerDay = isNaN(n) || n < 1 ? 2 : n;
            await this.plugin.saveSettings();
          })
      );

    // --- 오늘의 CS 개념 ---
    containerEl.createEl("h3", { text: "오늘의 CS 개념 (gyoogle)" });

    new Setting(containerEl)
      .setName("CS 개념 노트 사용")
      .setDesc(
        "gyoogle/tech-interview-for-developer(MIT)의 백엔드 주제를 매일 하나씩 가져와 보관함에 개념 노트로 만들고, 확인 질문을 답니다."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.gyoogleEnabled).onChange(async (v) => {
          this.plugin.settings.gyoogleEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("개념 노트 폴더")
      .setDesc("가져온 자료가 저장될 폴더. 이미 있는 노트는 덮어쓰지 않습니다.")
      .addText((t) =>
        t
          .setPlaceholder("CS 개념")
          .setValue(this.plugin.settings.gyoogleFolder)
          .onChange(async (v) => {
            this.plugin.settings.gyoogleFolder = v.trim() || "CS 개념";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("하루 개념 개수")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.gyooglePerDay))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.gyooglePerDay = isNaN(n) || n < 1 ? 1 : n;
            await this.plugin.saveSettings();
          })
      );

    // --- AI 추천 ---
    containerEl.createEl("h3", { text: "AI 다음 학습 추천" });

    new Setting(containerEl)
      .setName("AI 백엔드")
      .setDesc(
        "구독(Claude CLI): 로컬 claude 로그인을 사용 — API 키/추가 결제 불필요. API 키: Anthropic 종량제."
      )
      .addDropdown((d) => {
        d.addOption("cli", "구독 (Claude CLI)");
        d.addOption("api", "API 키 (종량제)");
        d.setValue(this.plugin.settings.aiBackend).onChange(async (v) => {
          this.plugin.settings.aiBackend = v === "api" ? "api" : "cli";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("claude CLI 경로")
      .setDesc(
        "구독 백엔드용. 'which claude'로 확인. PATH에 없으면 절대경로 (예: /opt/homebrew/bin/claude)"
      )
      .addText((t) =>
        t
          .setPlaceholder("claude")
          .setValue(this.plugin.settings.claudeCliPath)
          .onChange(async (v) => {
            this.plugin.settings.claudeCliPath = v.trim() || "claude";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Anthropic API 키")
      .setDesc(
        "API 키 백엔드용. console.anthropic.com 에서 발급. 직접 입력하세요."
      )
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.anthropicApiKey)
          .onChange(async (v) => {
            this.plugin.settings.anthropicApiKey = v.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("모델")
      .setDesc("CLI는 alias(opus/sonnet/haiku) 또는 전체명. 기본 claude-opus-4-8")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.aiModel)
          .onChange(async (v) => {
            this.plugin.settings.aiModel = v.trim() || "claude-opus-4-8";
            await this.plugin.saveSettings();
          })
      );
  }
}
