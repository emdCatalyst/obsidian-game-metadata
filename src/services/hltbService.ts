import { requestUrl } from "obsidian";

export interface HltbResult {
  gameName: string;
  gameplayMain: number; // in hours
  gameplayMainExtra: number; // in hours
  gameplayCompletionist: number; // in hours
}

interface HltbAuthSession {
  token: string;
  hpKey: string;
  hpVal: string;
  expiresAt: number;
}

export class HltbService {
  private static cachedSession: HltbAuthSession | null = null;
  private static readonly USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  /**
   * Clear cached auth session to prevent stale cache on plugin reload
   */
  static clearCache() {
    this.cachedSession = null;
  }

  /**
   * Fetch security session parameters from HLTB
   */
  private static async getAuthSession(forceRefresh = false): Promise<HltbAuthSession | null> {
    const now = Date.now();
    if (!forceRefresh && this.cachedSession && this.cachedSession.expiresAt > now) {
      return this.cachedSession;
    }

    try {
      const initUrl = `https://howlongtobeat.com/api/search/site/init?t=${now}`;
      const response = await requestUrl({
        url: initUrl,
        method: "GET",
        headers: {
          "User-Agent": this.USER_AGENT,
          "Referer": "https://howlongtobeat.com/",
        },
      });

      if (response.status === 200 && response.json) {
        const data = response.json;
        if (data.token) {
          this.cachedSession = {
            token: data.token,
            hpKey: data.hpKey || "",
            hpVal: data.hpVal || "",
            expiresAt: now + 10 * 60 * 1000, // 10 minutes cache
          };
          return this.cachedSession;
        }
      }
    } catch (e) {
      console.error("[GameMetadata] HLTB auth init error:", e);
    }

    return null;
  }

  /**
   * Search HowLongToBeat for game completion times.
   */
  static async search(gameTitle: string): Promise<HltbResult | null> {
    if (!gameTitle || gameTitle.trim().length === 0) return null;

    let session = await this.getAuthSession();
    if (!session) {
      session = await this.getAuthSession(true);
      if (!session) return null;
    }

    const cleanTitle = gameTitle
      .replace(/[:\-–—™®]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const searchTerms = cleanTitle.split(" ").filter(Boolean);

    const body: Record<string, any> = {
      searchType: "games",
      searchTerms: searchTerms,
      searchPage: 1,
      size: 10,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: 0, max: 0 },
          gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          rangeYear: { max: "", min: "" },
          modifier: "",
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0,
      },
      useCache: true,
    };

    if (session.hpKey && session.hpVal) {
      body[session.hpKey] = session.hpVal;
    }

    try {
      let response = await requestUrl({
        url: "https://howlongtobeat.com/api/search/site",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": session.token,
          "x-hp-key": session.hpKey,
          "x-hp-val": session.hpVal,
          "User-Agent": this.USER_AGENT,
          "Referer": "https://howlongtobeat.com/",
          "Origin": "https://howlongtobeat.com",
        },
        body: JSON.stringify(body),
        throw: false,
      });

      // Handle token expiration retry
      if (response.status === 403) {
        session = await this.getAuthSession(true);
        if (session) {
          if (session.hpKey && session.hpVal) {
            body[session.hpKey] = session.hpVal;
          }
          response = await requestUrl({
            url: "https://howlongtobeat.com/api/search/site",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": session.token,
              "x-hp-key": session.hpKey,
              "x-hp-val": session.hpVal,
              "User-Agent": this.USER_AGENT,
              "Referer": "https://howlongtobeat.com/",
              "Origin": "https://howlongtobeat.com",
            },
            body: JSON.stringify(body),
            throw: false,
          });
        }
      }

      if (response.status === 200 && response.json?.data && Array.isArray(response.json.data)) {
        const items = response.json.data;
        if (items.length > 0) {
          const gameItem = items.find((it: any) => it.game_type === "game") || items[0];
          return {
            gameName: gameItem.game_name,
            gameplayMain: Math.round(((gameItem.comp_main || 0) / 3600) * 10) / 10,
            gameplayMainExtra: Math.round(((gameItem.comp_plus || 0) / 3600) * 10) / 10,
            gameplayCompletionist: Math.round(((gameItem.comp_100 || 0) / 3600) * 10) / 10,
          };
        }
      }
    } catch (e) {
      console.error("[GameMetadata] HLTB search request failed:", e);
    }

    return null;
  }
}
