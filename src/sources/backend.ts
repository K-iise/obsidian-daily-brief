import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { BACKEND_CS, gyoogleUrl } from "../cs-backend";

/**
 * 백엔드 CS 지식 — gyoogle/tech-interview-for-developer 기반.
 * 매일 하나씩 회전하며 주제 + 원문 자료 링크를 던지고, 정리하도록 체크박스 제공.
 */
export class BackendCsSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "백엔드 CS 지식",
      emoji: "🧩",
      items: [],
      emptyText: "",
    };
    if (!this.settings.csBackendEnabled) return { ...section, items: [] };
    if (BACKEND_CS.length === 0) return { ...section, items: [] };

    const doy = dayOfYear(new Date());
    const n = Math.min(this.settings.csBackendPerDay || 1, BACKEND_CS.length);
    const start = (doy * n) % BACKEND_CS.length;

    const items: BriefItem[] = [];
    items.push({ text: `_gyoogle 기반 · 매일 하나씩_`, priority: 0 });

    for (let k = 0; k < n; k++) {
      const t = BACKEND_CS[(start + k) % BACKEND_CS.length];
      items.push({
        text: `❓ [${t.category}] ${t.title} — 핵심 개념과 면접 답변을 정리해보라.`,
        priority: 1 + k,
        key: `backend:${t.id}`,
      });
      items.push({
        text: `  ↳ 📎 [gyoogle 자료](${gyoogleUrl(t.path)})`,
        priority: 1 + k,
      });
      items.push({
        text: `  - [ ] \`${t.title}\` 정리하기`,
        priority: 1 + k,
        key: `backend:todo:${t.id}`,
      });
    }

    section.items = items;
    return section;
  }
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
