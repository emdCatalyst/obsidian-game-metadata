import { requestUrl } from "obsidian";
import { GameMetadata } from "../models/game";
import { GameDataProvider } from "./base";

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

      const data = response.json;
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      return data.items.map((item: any) => ({
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

      const appData = response.json[id.toString()];
      if (!appData || !appData.success || !appData.data) {
        throw new Error("Game not found on Steam.");
      }

      const data = appData.data;
      const releaseDate = data.release_date?.date || "";
      const releaseYear = releaseDate.match(/\d{4}/)?.[0];
      const genres = data.genres ? data.genres.map((g: any) => g.description) : [];
      const developers = data.developers || [];
      const publishers = data.publishers || [];
      const screenshots = data.screenshots ? data.screenshots.map((s: any) => s.path_full) : [];

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
