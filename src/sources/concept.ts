import { App } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { analyzeGaps, collectConceptNotes } from "../learning";

/**
 * 보관함 개념 노트 ↔ 현재 미션 CS 주제 갭 분석 → 다음 학습 추천.
 *  - 아직 노트가 없는 주제 = 다음에 정리할 것
 *  - 내용이 얇은 노트 = 보강할 것
 *  - 복습 태그 노트 = 복습할 것
 */
export class ConceptSource implements BriefSource {
  constructor(
    private app: App,
    private settings: DailyBriefSettings,
    private excludePath: string | null
  ) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "다음 학습 추천",
      emoji: "📚",
      items: [],
      emptyText: "추천할 학습 주제가 없습니다.",
    };
    if (!this.settings.conceptScanEnabled) return { ...section, items: [] };

    const notes = collectConceptNotes(this.app, this.settings, this.excludePath);
    const gap = analyzeGaps(notes, this.settings.currentMission, this.settings);
    if (!gap.mission) return section;

    const items: BriefItem[] = [];

    // 1) 미정리 주제 — 핵심 추천 (체크박스 로드맵)
    const total = gap.mission.topics.length;
    if (gap.uncovered.length > 0) {
      items.push({
        text: `_아직 노트가 없는 주제 (${gap.uncovered.length}/${total})_`,
        priority: 0,
      });
      gap.uncovered.forEach((t) => {
        // 같은 priority(1) + 삽입 순서 유지(stable sort)로 주제 바로 아래 링크가 붙는다.
        items.push({
          text: `[ ] ${t.title}`,
          priority: 1,
          key: `concept:gap:${t.id}`,
        });
        const refs = t.sites && t.sites.length ? t.sites : t.refs;
        const links = refs
          .slice(0, 2)
          .map((r) => `[${r.label}](${r.url})`)
          .join(" · ");
        if (links) {
          items.push({
            text: `  ↳ 📎 ${links}`,
            priority: 1,
            key: `concept:gap:${t.id}:links`,
          });
        }
      });
    } else if (total > 0) {
      items.push({
        text: `✅ 이 미션의 핵심 주제는 모두 노트가 있어요 (${gap.covered.length}/${total})`,
        priority: 0,
      });
    }

    // 1-b) 이미 정리한 주제 — 한 줄 요약 (로드맵 완료분)
    if (gap.covered.length > 0 && gap.uncovered.length > 0) {
      items.push({
        text: `✅ 정리함: ${gap.covered.map((t) => t.title).join(", ")}`,
        priority: 9,
        key: "concept:covered",
      });
    }

    // 2) 얇은 노트 보강 (최대 3개)
    const thin = gap.thin.slice(0, 3);
    if (thin.length > 0) {
      items.push({ text: `_보강하면 좋은 노트_`, priority: 10 });
      thin.forEach((n, i) => {
        items.push({
          text: `✍️ [[${n.title}]] (${n.sizeBytes}B — 얇음)`,
          priority: 11 + i,
          key: `concept:thin:${n.path}`,
        });
      });
    }

    // 3) 복습 태그 (최대 3개)
    const review = gap.review.slice(0, 3);
    if (review.length > 0) {
      items.push({ text: `_복습 태그_`, priority: 20 });
      review.forEach((n, i) => {
        items.push({
          text: `🔁 [[${n.title}]]`,
          priority: 21 + i,
          key: `concept:review:${n.path}`,
        });
      });
    }

    // 스캔 결과가 아예 없을 때 힌트
    if (items.length === 0) {
      items.push({
        text: `_${gap.notesScanned}개 노트를 봤지만 추천할 게 없어요. 설정에서 개념 폴더/태그를 확인해 보세요._`,
      });
    }

    section.items = items;
    return section;
  }
}
