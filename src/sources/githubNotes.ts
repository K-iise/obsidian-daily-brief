import { requestUrl } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import { findMission } from "../cs-knowledge";

/**
 * 사용자가 미션마다 인덱싱해 둔 GitHub 레포(예: K-iise/woowacourse-8th)를 읽어
 *   1) 미션 README의 기능 요구사항 체크리스트 진행률 + 남은 항목
 *   2) study-log/ 안의 최근 학습 노트(링크) + 복습 키워드(헤딩)
 * 를 데일리 브리프로 끌어온다.
 */
export class GitHubNotesSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "내 미션 노트",
      emoji: "🗂️",
      items: [],
      emptyText: "이 미션에 연결된 노트가 없습니다.",
    };

    if (!this.settings.ghNotesEnabled) return { ...section, items: [] };

    const repo = this.settings.notesRepo.trim();
    const mission = findMission(this.settings.currentMission);
    if (!repo || !mission?.notesPrefix) return section;

    const branch = this.settings.notesBranch.trim() || "main";
    const prefix = mission.notesPrefix;

    let paths: string[];
    try {
      paths = await this.listTree(repo, branch);
    } catch (e) {
      section.items.push({ text: `⚠️ 트리 조회 실패: ${(e as Error).message}` });
      return section;
    }

    const inMission = paths.filter((p) => p.startsWith(prefix));
    const readmes = inMission.filter((p) => /(^|\/)README\.md$/i.test(p));
    const logs = inMission
      .filter((p) => /study-log\//i.test(p) && /\.md$/i.test(p))
      .filter((p) => !/README\.md$/i.test(p))
      .sort()
      .reverse(); // 최신(번호 큰) 것 위로

    const items: BriefItem[] = [];

    // 1) 요구사항 진행률 — README들 합산
    let done = 0;
    let total = 0;
    const remaining: string[] = [];
    for (const r of readmes) {
      try {
        const md = await this.fetchFile(repo, branch, r);
        for (const line of md.split("\n")) {
          const m = line.match(/^\s*-\s*\[( |x|X)\]\s+(.+?)\s*$/);
          if (!m) continue;
          total++;
          if (m[1] === " ") {
            if (remaining.length < 5) remaining.push(m[2].replace(/[\[\]]/g, ""));
          } else {
            done++;
          }
        }
      } catch {
        /* skip */
      }
    }
    // 진행 중인 미션일 때만 이 섹션을 보여준다.
    // (미완료 요구사항이 남아있어야 '진행 중' — 100% 완료/요구사항 없음이면 섹션 숨김)
    const inProgress = total > 0 && done < total;
    if (!inProgress) {
      return { ...section, items: [], emptyText: undefined };
    }

    const pct = Math.round((done / total) * 100);
    items.push({
      text: `📋 기능 요구사항: **${done}/${total} (${pct}%)** 완료`,
      priority: 0,
      key: "ghnotes:progress",
    });
    for (const r of remaining) {
      items.push({ text: `[ ] ${r}`, priority: 1, key: `ghnotes:todo:${r}` });
    }

    // 2) 최근 학습 로그 — 최신 3개 링크
    const recent = logs.slice(0, 3);
    if (recent.length > 0) {
      items.push({ text: `_최근 학습 로그_`, priority: 2 });
      for (const p of recent) {
        items.push({
          text: `📓 [${baseName(p)}](${blobUrl(repo, branch, p)})`,
          priority: 3,
          key: `ghnotes:log:${p}`,
        });
      }
    }

    section.items = items;
    return section;
  }

  private async listTree(repo: string, branch: string): Promise<string[]> {
    const url = `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(
      branch
    )}?recursive=1`;
    const res = await requestUrl({ url, headers: this.headers(), throw: false });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    const json = res.json as { tree?: Array<{ path: string; type: string }> };
    return (json.tree ?? [])
      .filter((t) => t.type === "blob")
      .map((t) => t.path);
  }

  private async fetchFile(
    repo: string,
    branch: string,
    path: string
  ): Promise<string> {
    // raw.githubusercontent로 받으면 base64 디코딩 불필요
    const url = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(
      branch
    )}/${path.split("/").map(encodeURIComponent).join("/")}`;
    const res = await requestUrl({ url, headers: this.headers(), throw: false });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return res.text;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.settings.githubToken) {
      h["Authorization"] = `Bearer ${this.settings.githubToken}`;
    }
    return h;
  }
}

function blobUrl(repo: string, branch: string, path: string): string {
  return `https://github.com/${repo}/blob/${branch}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function baseName(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}
