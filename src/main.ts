import {
  Notice,
  Plugin,
  TFile,
  TFolder,
  normalizePath,
} from "obsidian";
import {
  DailyBriefSettings,
  DailyBriefSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { CalendarSource } from "./sources/calendar";
import { GitHubSource } from "./sources/github";
import { CsSource } from "./sources/cs";
import { GitHubNotesSource } from "./sources/githubNotes";
import { ConceptSource } from "./sources/concept";
import { FundamentalsSource } from "./sources/fundamentals";
import { BackendCsSource } from "./sources/backend";
import {
  formatDateForFilename,
  renderSections,
  upsertSection,
  upsertAiSection,
} from "./renderer";
import type { BriefSection } from "./types";
import { analyzeGaps, collectConceptNotes } from "./learning";
import { buildAiContext, recommendNextLearning, recommendViaCli } from "./ai";

export default class DailyBriefPlugin extends Plugin {
  settings!: DailyBriefSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new DailyBriefSettingTab(this.app, this));

    this.addCommand({
      id: "refresh-daily-brief",
      name: "오늘의 브리프 갱신",
      callback: () => this.refreshBrief(),
    });

    this.addCommand({
      id: "open-daily-brief-note",
      name: "오늘 데일리 노트 열기",
      callback: () => this.openTodayNote(),
    });

    this.addCommand({
      id: "ai-recommend-learning",
      name: "AI: 다음 학습 추천",
      callback: () => this.recommendLearning(),
    });

    // 리본 아이콘 — 가장 자주 쓸 동작
    this.addRibbonIcon("calendar-check", "오늘의 브리프 갱신", () =>
      this.refreshBrief()
    );
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /** 오늘의 데일리 노트 경로 (없으면 만들어줌) */
  private async getOrCreateTodayNote(): Promise<TFile> {
    const fileName =
      formatDateForFilename(new Date(), this.settings.dailyNoteDateFormat) +
      ".md";
    const folder = this.settings.dailyNoteFolder
      ? normalizePath(this.settings.dailyNoteFolder)
      : "";
    const path = folder ? normalizePath(`${folder}/${fileName}`) : fileName;

    // 폴더 보장
    if (folder) {
      const existing = this.app.vault.getAbstractFileByPath(folder);
      if (!existing) {
        await this.app.vault.createFolder(folder);
      } else if (!(existing instanceof TFolder)) {
        throw new Error(`'${folder}'은(는) 폴더가 아닙니다.`);
      }
    }

    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) return af;

    // 파일명이 곧 날짜(제목)이므로 H1은 넣지 않는다.
    return await this.app.vault.create(
      path,
      `## ${this.settings.sectionHeading}\n`
    );
  }

  async openTodayNote() {
    try {
      const file = await this.getOrCreateTodayNote();
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
    } catch (e) {
      new Notice(`데일리 노트 열기 실패: ${(e as Error).message}`);
    }
  }

  async recommendLearning() {
    const useApi = this.settings.aiBackend === "api";
    if (useApi && !this.settings.anthropicApiKey) {
      new Notice("API 키 백엔드입니다. 설정에서 Anthropic API 키를 입력하거나 백엔드를 '구독(CLI)'으로 바꾸세요.");
      return;
    }
    const notice = new Notice(
      useApi ? "AI(API)에게 다음 학습을 묻는 중..." : "AI(구독 CLI)에게 다음 학습을 묻는 중...",
      0
    );
    try {
      const file = await this.getOrCreateTodayNote();
      const notes = collectConceptNotes(this.app, this.settings, file.path);
      const gap = analyzeGaps(notes, this.settings.currentMission, this.settings);
      const ctx = buildAiContext(gap, notes, []);

      const recommendation = useApi
        ? await recommendNextLearning(this.settings, ctx)
        : await recommendViaCli(this.settings, ctx);

      const existing = await this.app.vault.read(file);
      const next = upsertAiSection(existing, recommendation, new Date());
      if (next !== existing) await this.app.vault.modify(file, next);

      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);

      notice.hide();
      new Notice("AI 학습 추천 완료");
    } catch (e) {
      notice.hide();
      new Notice(`AI 추천 실패: ${(e as Error).message}`);
      console.error("[daily-brief] ai recommend failed", e);
    }
  }

  async refreshBrief() {
    const notice = new Notice("오늘의 브리프를 모으는 중...", 0);
    try {
      const file = await this.getOrCreateTodayNote();

      const sources = [
        new CalendarSource(this.settings),
        new GitHubSource(this.settings),
        new GitHubNotesSource(this.settings),
        new CsSource(this.settings),
        new ConceptSource(this.app, this.settings, file.path),
        new FundamentalsSource(this.settings),
        new BackendCsSource(this.settings),
      ];

      const sections: BriefSection[] = [];
      for (const src of sources) {
        try {
          sections.push(await src.collect());
        } catch (e) {
          sections.push({
            title: "오류",
            emoji: "⚠️",
            items: [{ text: `소스 실패: ${(e as Error).message}` }],
          });
        }
      }

      const body = renderSections(sections);
      const existing = await this.app.vault.read(file);
      const next = upsertSection(
        existing,
        this.settings.sectionHeading,
        body,
        new Date()
      );

      if (next !== existing) {
        await this.app.vault.modify(file, next);
      }

      // 열어두기
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);

      notice.hide();
      new Notice("브리프 갱신 완료");
    } catch (e) {
      notice.hide();
      new Notice(`브리프 갱신 실패: ${(e as Error).message}`);
      console.error("[daily-brief] refresh failed", e);
    }
  }
}
