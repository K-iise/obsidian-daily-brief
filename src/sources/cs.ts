import type { BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { findMission, type CsTopic } from "../cs-knowledge";

/**
 * 현재 미션 기반 CS 학습 추천.
 * - "오늘의 주제" 1개를 날짜로 로테이션해 깊게 보여주고(왜+할일+레포 링크),
 * - 나머지 주제는 우선순위 순 체크리스트로 로드맵처럼 보여준다.
 */
export class CsSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "CS 학습",
      emoji: "🎓",
      items: [],
      emptyText: "",
    };

    if (!this.settings.csEnabled) return { ...section, items: [] };

    const mission = findMission(this.settings.currentMission);
    if (!mission || mission.topics.length === 0) return section;

    const topics = mission.topics;
    const todayIdx = dayOfYear(new Date()) % topics.length;
    const today = topics[todayIdx];

    // 1) 오늘의 주제 — 깊게 (세부는 중첩 불릿)
    section.items.push({
      text: `**오늘의 주제 — ${today.title}**`,
      priority: 0,
      key: `cs:today:${today.id}`,
    });
    section.items.push({ text: `💡 왜: ${today.why}`, indent: 1, priority: 0 });
    section.items.push({
      text: `✅ 오늘 할일: ${today.task}`,
      indent: 1,
      priority: 0,
    });
    section.items.push({
      text: `📎 참고: ${refLinks(today)}`,
      indent: 1,
      priority: 0,
    });

    // 전체 로드맵/진도는 '📚 다음 학습 추천' 섹션이 담당하므로 여기선 오늘의 주제만.
    return section;
  }
}

function refLinks(t: CsTopic): string {
  // 공신력 있는 외부 문서(sites)를 먼저, 그다음 큐레이션 레포(refs). 최대 3개.
  const all = [...(t.sites ?? []), ...t.refs];
  return all
    .slice(0, 3)
    .map((r) => `[${r.label}](${r.url})`)
    .join(" · ");
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}
