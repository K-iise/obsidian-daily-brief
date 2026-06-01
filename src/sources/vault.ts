import { App, TFile, normalizePath } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";

/**
 * 보관함 안의 마크다운에서 미완료 작업(`- [ ]`)을 수집한다.
 * - 데일리 브리프가 매번 갱신하는 "오늘 할일" 섹션 자체는 제외
 * - 마감일 형식이 들어 있으면 우선순위를 높임:
 *     📅 2026-06-01, due:: 2026-06-01, (2026-06-01)
 */
export class VaultTodoSource implements BriefSource {
  constructor(
    private app: App,
    private settings: DailyBriefSettings,
    private excludePath: string | null
  ) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "보관함 미완료",
      emoji: "📝",
      items: [],
      emptyText: "미완료 작업이 없습니다.",
    };
    if (!this.settings.scanVaultTodos) return { ...section, items: [] };

    const folders = this.settings.scanFolders
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => normalizePath(p));

    const files = this.app.vault.getMarkdownFiles().filter((f) => {
      if (this.excludePath && f.path === this.excludePath) return false;
      if (folders.length === 0) return true;
      return folders.some((d) => f.path === d || f.path.startsWith(d + "/"));
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: BriefItem[] = [];
    const seen = new Set<string>(); // 같은 작업 텍스트 중복 방지
    for (const file of files) {
      try {
        const content = await this.app.vault.cachedRead(file);
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const m = line.match(/^\s*-\s*\[\s\]\s+(.+?)\s*$/);
          if (!m) continue;
          const raw = m[1];

          const body = stripTaskMeta(raw);
          const dedupKey = body.replace(/\s+/g, " ").trim().toLowerCase();
          if (dedupKey && seen.has(dedupKey)) continue;
          seen.add(dedupKey);

          const due = extractDueDate(raw);
          const isOverdue = due ? new Date(due) < today : false;
          const isDueToday = due ? sameDay(new Date(due), today) : false;

          // 우선순위: 지남 < 오늘 < 마감일 있음 < 그 외
          let priority = 5;
          if (isOverdue) priority = 0;
          else if (isDueToday) priority = 1;
          else if (due) priority = 2;

          items.push({
            text: `${formatPrefix(isOverdue, isDueToday)}${body} — [[${file.basename}]]`,
            priority,
            due: due ?? undefined,
            key: `vault:${file.path}:${i}`,
          });
        }
      } catch {
        // skip unreadable
      }
    }

    items.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
    section.items = items.slice(0, this.settings.maxVaultTodos);
    return section;
  }
}

function extractDueDate(text: string): string | null {
  // 📅 2026-06-01 / due:: 2026-06-01 / (2026-06-01)
  const patterns = [
    /📅\s*(\d{4}-\d{2}-\d{2})/,
    /\bdue::\s*(\d{4}-\d{2}-\d{2})/i,
    /\((\d{4}-\d{2}-\d{2})\)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPrefix(overdue: boolean, today: boolean): string {
  if (overdue) return "🔴 ";
  if (today) return "🟡 ";
  return "";
}

function stripTaskMeta(text: string): string {
  // 너무 어지러우니 인라인 메타데이터는 표시에서 빼기 (값은 이미 추출함)
  return text
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\bdue::\s*\d{4}-\d{2}-\d{2}/gi, "")
    .trim();
}
