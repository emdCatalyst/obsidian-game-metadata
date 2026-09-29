import { requestUrl } from "obsidian";
import { GameMetadata } from "../models/game";
import { GameDataProvider } from "./base";

export class RawgProvider implements GameDataProvider {
  readonly id = "rawg";
  readonly name = "RAWG Video Games Database";
  private apiKey: string;
  private baseUrl = "https://api.rawg.io/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  setApiKey(key: string) {
    this.apiKey = key.trim();
  }

  async search(query: string): Promise<GameMetadata[]> {
    if (!this.apiKey) {
      throw new Error("RAWG API Key is missing. Please configure it in plugin settings.");
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(
      query.trim()
    )}&page_size=20&search_precise=true`;

    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`RAWG API error: ${response.status} ${response.text}`);
      }

      const data = response.json;
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((item: any) => this.mapSearchItemToMetadata(item));
    } catch (error) {
      console.error("[GameMetadata] RAWG Search error:", error);
      throw error;
    }
  }

  async getDetails(id: string | number): Promise<GameMetadata> {
    if (!this.apiKey) {
      throw new Error("RAWG API Key is missing. Please configure it in plugin settings.");
    }

    const url = `${this.baseUrl}/games/${id}?key=${this.apiKey}`;
    const screenshotsUrl = `${this.baseUrl}/games/${id}/screenshots?key=${this.apiKey}`;

    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianGameMetadataPlugin/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`RAWG API error: ${response.status} ${response.text}`);
      }

      const data = response.json;

      // Try fetching screenshots
      let screenshots: string[] = [];
      try {
        const screensResponse = await requestUrl({
          url: screenshotsUrl,
          method: "GET",
        });
        if (screensResponse.status === 200 && screensResponse.json?.results) {
          screenshots = screensResponse.json.results.map((s: any) => s.image).filter(Boolean);
        }
      } catch (e) {
        // Optional screenshots failure, non-fatal
      }

      return this.mapFullDetailsToMetadata(data, screenshots);
    } catch (error) {
      console.error("[GameMetadata] RAWG GetDetails error:", error);
      throw error;
    }
  }

  private mapSearchItemToMetadata(item: any): GameMetadata {
    const releaseYear = item.released ? item.released.substring(0, 4) : undefined;
    const platforms = item.platforms
      ? item.platforms.map((p: any) => p.platform?.name).filter(Boolean)
      : [];
    const genres = item.genres ? item.genres.map((g: any) => g.name).filter(Boolean) : [];

    return {
      id: item.id,
      title: item.name,
      slug: item.slug,
      releaseDate: item.released || undefined,
      releaseYear,
      coverImage: item.background_image || undefined,
      bannerImage: item.background_image || undefined,
      rating: item.rating ? Number(item.rating.toFixed(1)) : undefined,
      metacritic: item.metacritic || undefined,
      platforms,
      genres,
      rawProvider: "rawg",
    };
  }

  private mapFullDetailsToMetadata(data: any, screenshots: string[]): GameMetadata {
    const releaseYear = data.released ? data.released.substring(0, 4) : undefined;
    const platforms = data.platforms
      ? data.platforms.map((p: any) => p.platform?.name).filter(Boolean)
      : [];
    const genres = data.genres ? data.genres.map((g: any) => g.name).filter(Boolean) : [];
    const developers = data.developers ? data.developers.map((d: any) => d.name).filter(Boolean) : [];
    const publishers = data.publishers ? data.publishers.map((p: any) => p.name).filter(Boolean) : [];
    const tags = data.tags ? data.tags.map((t: any) => t.name).slice(0, 10).filter(Boolean) : [];

      let description = data.description_raw || "";
      if (!description && data.description) {
        description = data.description.replace(/<[^>]*>?/gm, "").trim();
      }

    return {
      id: data.id,
      title: data.name,
      slug: data.slug,
      releaseDate: data.released || undefined,
      releaseYear,
      description,
      shortDescription: description.slice(0, 300) + (description.length > 300 ? "..." : ""),
      coverImage: data.background_image || undefined,
      bannerImage: data.background_image_additional || data.background_image || undefined,
      screenshots: screenshots.length > 0 ? screenshots : (data.background_image ? [data.background_image] : []),
      genres,
      platforms,
      developers,
      publishers,
      rating: data.rating ? Number(data.rating.toFixed(1)) : undefined,
      metacritic: data.metacritic || undefined,
      esrbRating: data.esrb_rating?.name || undefined,
      website: data.website || undefined,
      playtime: data.playtime || undefined,
      tags,
      links: [
        ...(data.slug ? [`https://rawg.io/games/${data.slug}`] : []),
        ...(data.website ? [data.website] : []),
      ],
      rawProvider: "rawg",
    };
  }
}
