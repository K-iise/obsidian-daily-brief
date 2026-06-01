import type { BriefSection } from "./types";

const BEGIN_MARK = "<!-- daily-brief:begin -->";
const END_MARK = "<!-- daily-brief:end -->";

/**
 * 섹션 배열을 마크다운으로 렌더링.
 * 빈 섹션은 emptyText가 있을 때만 표시, 없으면 숨김.
 */
export function renderSections(sections: BriefSection[]): string {
  const blocks: string[] = [];
  for (const s of sections) {
    if (s.items.length === 0 && !s.emptyText) continue;

    blocks.push(`### ${s.emoji} ${s.title}`);
    if (s.items.length === 0) {
      blocks.push(`_${s.emptyText}_`);
    } else {
      const sorted = [...s.items].sort(
        (a, b) => (a.priority ?? 9) - (b.priority ?? 9)
      );
      for (const item of sorted) {
        blocks.push(`- ${item.text}`);
      }
    }
    blocks.push("");
  }
  return blocks.join("\n").trimEnd();
}

/**
 * 데일리 노트에 헤딩 섹션을 삽입/교체.
 *   ## {heading}
 *   <!-- daily-brief:begin -->
 *   ...자동 생성...
 *   <!-- daily-brief:end -->
 *
 * 마커가 있으면 그 안만 교체. 없으면 헤딩 아래에 새로 삽입.
 * 헤딩도 없으면 문서 끝에 추가.
 */
export function upsertSection(
  existing: string,
  heading: string,
  body: string,
  updatedAt: Date = new Date()
): string {
  const stamp = `_업데이트: ${formatLocal(updatedAt)}_`;
  const wrapped = `${BEGIN_MARK}\n${stamp}\n\n${body}\n${END_MARK}`;

  // 1) 마커가 이미 있으면 그 안만 교체
  const markerRe = new RegExp(
    `${escapeRe(BEGIN_MARK)}[\\s\\S]*?${escapeRe(END_MARK)}`,
    "m"
  );
  if (markerRe.test(existing)) {
    return existing.replace(markerRe, wrapped);
  }

  // 2) 같은 레벨의 헤딩이 있으면 그 헤딩 바로 아래에 마커 삽입
  const headingRe = new RegExp(
    `^(##\\s+${escapeRe(heading)}\\s*)$`,
    "m"
  );
  if (headingRe.test(existing)) {
    return existing.replace(headingRe, (m) => `${m}\n${wrapped}`);
  }

  // 3) 둘 다 없으면 문서 끝에 새 섹션으로 추가
  const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n\n" : "\n";
  return `${existing}${sep}## ${heading}\n${wrapped}\n`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const AI_BEGIN = "<!-- daily-brief:ai:begin -->";
const AI_END = "<!-- daily-brief:ai:end -->";

/**
 * AI 추천 블록을 데일리 노트에 삽입/교체. 브리프 섹션과 별개의 마커를 쓴다.
 * 문서에 마커가 있으면 그 안만 교체, 없으면 문서 끝에 새 블록 추가.
 */
export function upsertAiSection(
  existing: string,
  body: string,
  updatedAt: Date = new Date()
): string {
  const stamp = `_AI 추천 · ${formatLocal(updatedAt)}_`;
  const block = `${AI_BEGIN}\n### 🤖 AI 학습 추천\n${stamp}\n\n${body}\n${AI_END}`;

  const re = new RegExp(
    `${escapeRe(AI_BEGIN)}[\\s\\S]*?${escapeRe(AI_END)}`,
    "m"
  );
  if (re.test(existing)) return existing.replace(re, block);

  const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n\n" : "\n";
  return `${existing}${sep}${block}\n`;
}

export function formatDateForFilename(d: Date, format: string): string {
  return format
    .replace("YYYY", String(d.getFullYear()))
    .replace("MM", pad(d.getMonth() + 1))
    .replace("DD", pad(d.getDate()));
}
