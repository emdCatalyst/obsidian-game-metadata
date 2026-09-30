export class IdentifierService {
  /**
   * Extract VNDB ID from links array (e.g. 'https://vndb.org/v17' -> 'v17').
   */
  static extractVndbIdFromLinks(links?: string[]): string | undefined {
    if (!links || !Array.isArray(links)) return undefined;

    for (const link of links) {
      if (typeof link !== "string") continue;
      const match = link.match(/vndb\.org\/(v\d+)/i);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  /**
   * Extract Steam App ID from links array (e.g. 'https://store.steampowered.com/app/1086940' -> '1086940').
   */
  static extractSteamIdFromLinks(links?: string[]): string | undefined {
    if (!links || !Array.isArray(links)) return undefined;

    for (const link of links) {
      if (typeof link !== "string") continue;
      const match = link.match(/store\.steampowered\.com\/app\/(\d+)/i);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  /**
   * Extract RAWG game slug from links array (e.g. 'https://rawg.io/games/baldurs-gate-3' -> 'baldurs-gate-3').
   */
  static extractRawgSlugFromLinks(links?: string[]): string | undefined {
    if (!links || !Array.isArray(links)) return undefined;

    for (const link of links) {
      if (typeof link !== "string") continue;
      const match = link.match(/rawg\.io\/games\/([a-zA-Z0-9-]+)/i);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }
}
