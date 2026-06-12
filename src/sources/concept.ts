import { App } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { analyzeGaps, collectConceptNotes } from "../learning";
import type { CsTopic } from "../cs-knowledge";

/**
 * CS 인터뷰식 '오늘의 질문' 섹션.
 *  - 아직 노트가 없는 주제(=학습 정도상 우선)에서 매일 회전하며 N개를 골라
 *    질문 + 힌트 + 참고 링크를 던진다. 학습자가 직접 답을 정리하도록.
 *  - 모든 주제를 이미 정리했으면 복습 질문(covered)에서 회전.
 */
export class ConceptSource implements BriefSource {
  constructor(
    private app: App,
    private settings: DailyBriefSettings,
    private excludePath: string | null
  ) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "오늘의 CS 질문",
      emoji: "📚",
      items: [],
      emptyText: "",
    };
    if (!this.settings.conceptScanEnabled) return { ...section, items: [] };

    const notes = collectConceptNotes(this.app, this.settings, this.excludePath);
    const gap = analyzeGaps(notes, this.settings.currentMission, this.settings);
    if (!gap.mission) return section;

    const total = gap.mission.topics.length;
    // 우선순위: 아직 노트 없는 주제 → 없으면 복습(이미 정리한 주제)
    const reviewing = gap.uncovered.length === 0;
    const pool = reviewing ? gap.covered : gap.uncovered;
    if (pool.length === 0) return section;

    const doy = dayOfYear(new Date());
    const n = Math.min(this.settings.csQuestionsPerDay || 2, pool.length);
    // 묶음 단위로 회전 → 연속된 날에 같은 주제가 겹치지 않게
    const start = (doy * n) % pool.length;

    const items: BriefItem[] = [];
    items.push({
      text: reviewing
        ? `_복습 질문 — 핵심 주제 ${gap.covered.length}/${total} 정리 완료_`
        : `_정리해볼 질문 (남은 주제 ${gap.uncovered.length}/${total})_`,
      plain: true,
      priority: 0,
    });

    for (let k = 0; k < n; k++) {
      const topic = pool[(start + k) % pool.length];
      const q = pickQuestion(topic, doy + k);
      // 질문(불릿) + 힌트/링크/정리체크박스(중첩)
      items.push({
        text: `❓ ${q}`,
        priority: 1 + k,
        key: `cs-q:${topic.id}`,
      });
      if (topic.hint) {
        items.push({ text: `💡 ${topic.hint}`, indent: 1, priority: 1 + k });
      }
      const links = refLinks(topic);
      if (links) {
        items.push({ text: `📎 ${links}`, indent: 1, priority: 1 + k });
      }
      items.push({
        text: `\`${topic.title}\` 노트로 정리하기`,
        indent: 1,
        checkbox: true,
        priority: 1 + k,
        key: `cs-q:todo:${topic.id}`,
      });
    }

    section.items = items;
    return section;
  }
}

function pickQuestion(t: CsTopic, seed: number): string {
  if (t.questions && t.questions.length) {
    return t.questions[((seed % t.questions.length) + t.questions.length) % t.questions.length];
  }
  return `${t.title} — 핵심을 한 문단으로 정리해보라.`;
}

function refLinks(t: CsTopic): string {
  const all = [...(t.sites ?? []), ...t.refs];
  return all
    .slice(0, 2)
    .map((r) => `[${r.label}](${r.url})`)
    .join(" · ");
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
