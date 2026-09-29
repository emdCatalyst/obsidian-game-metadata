import { requestUrl } from "obsidian";
import { GameMetadata } from "../models/game";
import { GameDataProvider } from "./base";

export class VndbProvider implements GameDataProvider {
  readonly id = "vndb";
  readonly name = "VNDB (Visual Novel Database)";
  private readonly baseUrl = "https://api.vndb.org/kana/vn";

  async search(query: string): Promise<GameMetadata[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmed = query.trim();

    try {
      const response = await requestUrl({
        url: this.baseUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
        body: JSON.stringify({
          filters: ["search", "=", trimmed],
          fields:
            "id, title, alttitle, titles{title, latin, lang, official, main}, length, length_minutes, description, rating, votecount, image{url, sexual, violence}, screenshots{url}, tags{name}, developers{name, original}, released, languages, platforms",
          results: 15,
        }),
      });

      if (response.status !== 200) {
        throw new Error(`VNDB API error: ${response.status}`);
      }

      const data = response.json;
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((item: any) => this.mapVnToMetadata(item));
    } catch (error) {
      console.error("[GameMetadata] VNDB Search error:", error);
      throw error;
    }
  }

  async getDetails(id: string | number): Promise<GameMetadata> {
    const vnId = id.toString().startsWith("v") ? id.toString() : `v${id}`;

    try {
      const response = await requestUrl({
        url: this.baseUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
        body: JSON.stringify({
          filters: ["id", "=", vnId],
          fields:
            "id, title, alttitle, titles{title, latin, lang, official, main}, length, length_minutes, description, rating, votecount, image{url, sexual, violence}, screenshots{url}, tags{name}, developers{name, original}, released, languages, platforms",
          results: 1,
        }),
      });

      if (response.status !== 200) {
        throw new Error(`VNDB API error: ${response.status}`);
      }

      const data = response.json;
      if (!data.results || data.results.length === 0) {
        throw new Error("Visual novel not found on VNDB.");
      }

      return this.mapVnToMetadata(data.results[0]);
    } catch (error) {
      console.error("[GameMetadata] VNDB GetDetails error:", error);
      throw error;
    }
  }

  private mapVnToMetadata(vn: any): GameMetadata {
    const releaseYear = vn.released ? vn.released.substring(0, 4) : undefined;
    const developers = vn.developers ? vn.developers.map((d: any) => d.name).filter(Boolean) : [];
    const originalTitle = vn.alttitle || (vn.titles ? vn.titles.find((t: any) => t.lang === "ja")?.title : undefined);
    
    const cleanDesc = this.cleanBbCode(vn.description || "");

    const screenshots = vn.screenshots ? vn.screenshots.map((s: any) => s.url).filter(Boolean) : [];
    const coverUrl = vn.image?.url || (screenshots.length > 0 ? screenshots[0] : undefined);
    const bannerUrl = screenshots.length > 0 ? screenshots[0] : coverUrl;

    let playtimeHours: number | undefined;
    if (vn.length_minutes) {
      playtimeHours = Math.round((vn.length_minutes / 60) * 10) / 10;
    } else if (vn.length) {
      const lengthMap: Record<number, number> = { 1: 1.5, 2: 6, 3: 20, 4: 40, 5: 60 };
      playtimeHours = lengthMap[vn.length];
    }

    const rating10 = vn.rating ? Math.round((vn.rating / 10) * 10) / 10 : undefined;
    const tags = vn.tags ? vn.tags.map((t: any) => t.name).slice(0, 10).filter(Boolean) : [];

    // Platforms mapping
    const platformMap: Record<string, string> = {
      win: "PC (Windows)",
      lin: "Linux",
      mac: "Mac",
      ps4: "PlayStation 4",
      ps5: "PlayStation 5",
      psv: "PS Vita",
      swi: "Nintendo Switch",
      and: "Android",
      ios: "iOS",
      drc: "Dreamcast",
      psp: "PSP",
      ps3: "PlayStation 3",
      ps2: "PlayStation 2",
      nds: "Nintendo DS",
      n3d: "Nintendo 3DS",
    };
    const platforms = vn.platforms
      ? vn.platforms.map((p: string) => platformMap[p] || p.toUpperCase()).filter(Boolean)
      : [];

    return {
      id: vn.id,
      vndbId: vn.id,
      title: vn.title,
      originalTitle,
      type: "visual_novel",
      releaseDate: vn.released || undefined,
      releaseYear,
      description: cleanDesc,
      shortDescription: cleanDesc.slice(0, 300) + (cleanDesc.length > 300 ? "..." : ""),
      coverImage: coverUrl,
      bannerImage: bannerUrl,
      screenshots,
      genres: ["Visual Novel"],
      platforms,
      developers,
      rating: rating10,
      hltbMain: playtimeHours,
      tags: ["visual-novel", ...tags],
      links: [`https://vndb.org/${vn.id}`],
      rawProvider: "vndb",
    };
  }

  private cleanBbCode(text: string): string {
    return text
      .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, "$2 ($1)")
      .replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, "==Spoiler: $1==")
      .replace(/\[\/?(b|i|u|s|code|quote|raw)\]/gi, "")
      .replace(/\[\/?(url)\]/gi, "")
      .trim();
  }
}
