import { requestUrl } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";

/**
 * GitHub Search API로 다음을 수집:
 *   1) 리뷰 요청 받은 열린 PR
 *   2) 내가 만든 열린 PR
 *   3) 나에게 할당된 열린 이슈
 *
 * 인증 없이도 동작은 하지만 rate limit이 매우 낮으므로 토큰 사용 권장.
 */
export class GitHubSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "GitHub",
      emoji: "💻",
      items: [],
      emptyText: "",
    };

    const { githubEnabled, githubToken, githubUsername } = this.settings;
    if (!githubEnabled) return { ...section, items: [] };

    if (!githubUsername) {
      section.items.push({
        text: "⚠️ GitHub 사용자명이 설정되지 않았습니다.",
        priority: 0,
      });
      return section;
    }

    const items: BriefItem[] = [];

    try {
      // 1) 리뷰 요청 받은 PR — 가장 시급
      const reviewRequested = await this.search(
        `is:open is:pr review-requested:${githubUsername} archived:false`,
        githubToken
      );
      for (const it of reviewRequested) {
        items.push({
          text: `👀 리뷰 요청: [${escapeMd(it.title)}](${it.html_url}) — ${repoOf(
            it.html_url
          )}`,
          priority: 0,
          key: `gh:review:${it.html_url}`,
        });
      }

      // 2) 내 열린 PR — 최근 N일 내 활동만 (오래된 제출 PR 노이즈 제거)
      const since = isoDaysAgo(this.settings.githubActiveDays);
      const myPrs = await this.search(
        `is:open is:pr author:${githubUsername} archived:false updated:>=${since}`,
        githubToken
      );
      for (const it of myPrs) {
        items.push({
          text: `🔧 내 PR: [${escapeMd(it.title)}](${it.html_url}) — ${repoOf(
            it.html_url
          )}`,
          priority: 1,
          key: `gh:mypr:${it.html_url}`,
        });
      }

      // 3) 할당된 이슈
      const assigned = await this.search(
        `is:open is:issue assignee:${githubUsername} archived:false`,
        githubToken
      );
      for (const it of assigned) {
        items.push({
          text: `📌 할당 이슈: [${escapeMd(it.title)}](${it.html_url}) — ${repoOf(
            it.html_url
          )}`,
          priority: 2,
          key: `gh:issue:${it.html_url}`,
        });
      }
    } catch (e) {
      items.push({
        text: `⚠️ GitHub 조회 실패: ${(e as Error).message}`,
        priority: 0,
      });
    }

    section.items = items;
    return section;
  }

  private async search(
    q: string,
    token: string
  ): Promise<Array<{ title: string; html_url: string }>> {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
      q
    )}&per_page=20&sort=updated`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await requestUrl({ url, headers, throw: false });
    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status} — ${truncate(res.text, 120)}`);
    }
    const json = res.json as { items?: Array<{ title: string; html_url: string }> };
    return json.items ?? [];
  }
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (isNaN(days) ? 14 : days));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function repoOf(htmlUrl: string): string {
  // https://github.com/owner/repo/pull/123 → owner/repo
  const m = htmlUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return m ? m[1] : "";
}

function escapeMd(s: string): string {
  return s.replace(/[\[\]]/g, "");
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "..." : s;
}
