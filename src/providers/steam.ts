import { requestUrl } from "obsidian";
import { GameMetadata } from "../models/game";
import { GameDataProvider } from "./base";

interface SteamStoreSearchItem {
  id: number | string;
  name: string;
  tiny_image?: string;
  metascore?: string | number;
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
}

interface SteamSearchApiResponse {
  items?: SteamStoreSearchItem[];
}

interface SteamAppDetailsData {
  name: string;
  release_date?: { date?: string };
  genres?: Array<{ id?: string; description?: string }>;
  developers?: string[];
  publishers?: string[];
  screenshots?: Array<{ id?: number; path_full?: string }>;
  short_description?: string;
  detailed_description?: string;
  header_image?: string;
  metacritic?: { score?: number; url?: string };
  website?: string;
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
}

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: SteamAppDetailsData;
  };
}

export class SteamProvider implements GameDataProvider {
  readonly id = "steam";
  readonly name = "Steam Store";

  async search(query: string): Promise<GameMetadata[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
      query.trim()
    )}&l=english&cc=US`;

    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`Steam API error: ${response.status}`);
      }

      const data = response.json as SteamSearchApiResponse;
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      return data.items.map((item: SteamStoreSearchItem) => ({
        id: item.id.toString(),
        steamId: item.id.toString(),
        title: item.name,
        coverImage: item.tiny_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
        bannerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
        metacritic: item.metascore ? Number(item.metascore) : undefined,
        platforms: [
          ...(item.platforms?.windows ? ["PC (Windows)"] : []),
          ...(item.platforms?.mac ? ["Mac"] : []),
          ...(item.platforms?.linux ? ["Linux"] : []),
        ],
        rawProvider: "steam",
      }));
    } catch (error) {
      console.error("[GameMetadata] Steam Search error:", error);
      throw error;
    }
  }

  async getDetails(id: string | number): Promise<GameMetadata> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${id}&l=english`;

    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`Steam API error: ${response.status}`);
      }

      const responseData = response.json as SteamAppDetailsResponse;
      const appData = responseData[id.toString()];
      if (!appData || !appData.success || !appData.data) {
        throw new Error("Game not found on Steam.");
      }

      const data = appData.data;
      const releaseDate = data.release_date?.date || "";
      const releaseYear = releaseDate.match(/\d{4}/)?.[0];
      const genres = data.genres
        ? data.genres
            .map((g) => g.description)
            .filter((d): d is string => typeof d === "string" && d.length > 0)
        : [];
      const developers = data.developers || [];
      const publishers = data.publishers || [];
      const screenshots = data.screenshots
        ? data.screenshots
            .map((s) => s.path_full)
            .filter((p): p is string => typeof p === "string" && p.length > 0)
        : [];

      let cleanDesc = data.short_description || "";
      if (!cleanDesc && data.detailed_description) {
        cleanDesc = data.detailed_description.replace(/<[^>]*>?/gm, "").trim();
      }

      const platforms: string[] = [];
      if (data.platforms?.windows) platforms.push("PC (Windows)");
      if (data.platforms?.mac) platforms.push("Mac");
      if (data.platforms?.linux) platforms.push("Linux");

      return {
        id: id.toString(),
        steamId: id.toString(),
        title: data.name,
        releaseDate,
        releaseYear,
        description: cleanDesc,
        shortDescription: cleanDesc.slice(0, 300) + (cleanDesc.length > 300 ? "..." : ""),
        coverImage: data.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`,
        bannerImage: screenshots[0] || data.header_image,
        screenshots,
        genres,
        platforms,
        developers,
        publishers,
        metacritic: data.metacritic?.score || undefined,
        website: data.website || undefined,
        links: [
          `https://store.steampowered.com/app/${id}`,
          ...(data.website ? [data.website] : []),
        ],
        rawProvider: "steam",
      };
    } catch (error) {
      console.error("[GameMetadata] Steam GetDetails error:", error);
      throw error;
    }
  }
}
