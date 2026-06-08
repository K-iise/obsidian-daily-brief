import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { CIU, FUNDAMENTALS, type FundTopic } from "../cs-fundamentals";

/**
 * CS 기초 질문 — coding-interview-university 커리큘럼 기반, 미션 무관.
 * 매일 회전하며 질문 + 힌트 + 참고 링크(canonical 문서 + CIU 레포)를 던진다.
 */
export class FundamentalsSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "CS 기초",
      emoji: "🧠",
      items: [],
      emptyText: "",
    };
    if (!this.settings.csFundamentalsEnabled) return { ...section, items: [] };
    if (FUNDAMENTALS.length === 0) return { ...section, items: [] };

    const doy = dayOfYear(new Date());
    const n = Math.min(this.settings.csFundamentalsPerDay || 1, FUNDAMENTALS.length);
    const start = (doy * n) % FUNDAMENTALS.length;

    const items: BriefItem[] = [];
    items.push({
      text: `_coding-interview-university 기반 · 매일 회전_`,
      priority: 0,
    });

    for (let k = 0; k < n; k++) {
      const topic = FUNDAMENTALS[(start + k) % FUNDAMENTALS.length];
      const q = topic.questions[(doy + k) % topic.questions.length];
      items.push({
        text: `❓ [${topic.title}] ${q}`,
        priority: 1 + k,
        key: `fund:${topic.id}`,
      });
      items.push({ text: `  ↳ 💡 ${topic.hint}`, priority: 1 + k });
      items.push({ text: `  ↳ 📎 ${refLinks(topic)}`, priority: 1 + k });
      items.push({
        text: `  - [ ] \`${topic.title}\` 정리하기`,
        priority: 1 + k,
        key: `fund:todo:${topic.id}`,
      });
    }

    section.items = items;
    return section;
  }
}

function refLinks(t: FundTopic): string {
  return [...t.sites, CIU].map((r) => `[${r.label}](${r.url})`).join(" · ");
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
