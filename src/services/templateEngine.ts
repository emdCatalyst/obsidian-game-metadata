import { moment } from "obsidian";
import { GameMetadata, GameMetadataPluginSettings } from "../models/game";

export class TemplateEngine {
  /**
   * Calculate calendar days difference between start and finish dates using Obsidian native Moment.js.
   */
  static calculateDaysBetween(startDateStr?: string, endDateStr?: string): number | undefined {
    if (!startDateStr || !endDateStr) return undefined;

    const start = moment(startDateStr.trim(), ["YYYY-MM-DD", "YYYY/MM/DD", moment.ISO_8601], true);
    const end = moment(endDateStr.trim(), ["YYYY-MM-DD", "YYYY/MM/DD", moment.ISO_8601], true);

    const mStart = start.isValid() ? start : moment(startDateStr.trim());
    const mEnd = end.isValid() ? end : moment(endDateStr.trim());

    if (!mStart.isValid() || !mEnd.isValid()) return undefined;

    const diff = mEnd.startOf("day").diff(mStart.startOf("day"), "days");
    return diff >= 0 ? diff : undefined;
  }

  /**
   * Format an array of URLs or markdown links into a clean markdown bulleted list.
   */
  static formatLinksList(links?: string[]): string {
    if (!links || links.length === 0) return "";

    const cleanLinks = links
      .map((l) => (typeof l === "string" ? l.trim() : ""))
      .filter((l) => l.length > 0);

    if (cleanLinks.length === 0) return "";

    const formattedLines: string[] = [];

    for (const link of cleanLinks) {
      if (/^\[.+\]\(.+\)$/.test(link)) {
        formattedLines.push(`- ${link}`);
        continue;
      }

      let label = "Link";
      try {
        const urlObj = new URL(link);
        const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");

        if (host.includes("vndb.org")) label = "VNDB";
        else if (host.includes("steampowered.com")) label = "Steam Store";
        else if (host.includes("steamcommunity.com")) label = "Steam Community";
        else if (host.includes("rawg.io")) label = "RAWG";
        else if (host.includes("howlongtobeat.com")) label = "HowLongToBeat";
        else if (host.includes("metacritic.com")) label = "Metacritic";
        else if (host.includes("gog.com")) label = "GOG";
        else if (host.includes("epicgames.com")) label = "Epic Games";
        else if (host.includes("itch.io")) label = "Itch.io";
        else if (host.includes("dlsite.com")) label = "DLsite";
        else if (host.includes("dmm.co.jp") || host.includes("fanza.co.jp")) label = "FANZA";
        else if (host.includes("patreon.com")) label = "Patreon";
        else if (host.includes("kickstarter.com")) label = "Kickstarter";
        else if (host.includes("subscribestar.adult") || host.includes("subscribestar.com")) label = "SubscribeStar";
        else if (host.includes("wikipedia.org")) label = "Wikipedia";
        else if (host.includes("youtube.com") || host.includes("youtu.be")) label = "YouTube";
        else if (host.includes("ign.com")) label = "IGN";
        else if (host.includes("gamespot.com")) label = "GameSpot";
        else if (host.includes("twitter.com") || host.includes("x.com")) label = "X / Twitter";
        else if (host.includes("discord.gg") || host.includes("discord.com")) label = "Discord";
        else if (host.includes("github.com")) label = "GitHub";
        else label = host;
      } catch {
        label = "Link";
      }

      formattedLines.push(`- [${label}](${link})`);
    }

    return formattedLines.join("\n");
  }

  /**
   * Render template string with GameMetadata and plugin settings context.
   */
  static render(template: string, game: GameMetadata, settings: GameMetadataPluginSettings): string {
    if (!template) return "";

    const bannerUrl = this.resolveBannerUrl(game, settings);
    const coverUrl = game.coverImage || "";
    const year = game.releaseYear || (game.releaseDate ? game.releaseDate.substring(0, 4) : "");
    const released = game.releaseDate || "N/A";
    const rawRating = game.rating !== undefined ? game.rating.toString() : "";
    const metacritic = game.metacritic !== undefined ? game.metacritic.toString() : "";
    const metacriticDisplay = game.metacritic !== undefined ? ` (Metacritic: ${game.metacritic})` : "";

    // Dynamic scale formatting: VNDB is /10, RAWG is /5, fallback N/A
    let ratingDisplay = "N/A";
    if (game.rating !== undefined) {
      if (game.type === "visual_novel") {
        ratingDisplay = `${game.rating}/10`;
      } else {
        ratingDisplay = `${game.rating}/5`;
      }
    }

    const playtime = game.playtime !== undefined ? `${game.playtime} hrs` : "";
    const status = game.userStatus || settings.defaultPlayStatus || "Backlog";
    const userPlaytime = game.userPlaytime || "";
    const userRating = game.userRating || "";

    // Days calculation
    const daysCalc =
      game.daysToBeat !== undefined
        ? game.daysToBeat
        : this.calculateDaysBetween(game.userStartDate, game.userEndDate);

    let daysToBeatStr = "";
    let daysToBeatDisplay = "";
    let daysToBeatRaw = "";

    if (daysCalc !== undefined) {
      daysToBeatRaw = daysCalc.toString();
      if (daysCalc === 0) {
        daysToBeatStr = "0 days (same day)";
        daysToBeatDisplay = " (same day)";
      } else if (daysCalc === 1) {
        daysToBeatStr = "1 day";
        daysToBeatDisplay = " (took 1 day)";
      } else {
        daysToBeatStr = `${daysCalc} days`;
        daysToBeatDisplay = ` (took ${daysCalc} days)`;
      }
    }

    const hltbMain = game.hltbMain !== undefined ? `${game.hltbMain} hrs` : "N/A";
    const hltbExtra = game.hltbMainExtra !== undefined ? `${game.hltbMainExtra} hrs` : "N/A";
    const hltbCompletionist = game.hltbCompletionist !== undefined ? `${game.hltbCompletionist} hrs` : "N/A";

    const genresCsv = (game.genres && game.genres.length > 0) ? game.genres.join(", ") : "N/A";
    const platformsCsv = (game.platforms && game.platforms.length > 0) ? game.platforms.join(", ") : "N/A";
    const developersCsv = (game.developers && game.developers.length > 0) ? game.developers.join(", ") : "N/A";
    const publishersCsv = (game.publishers && game.publishers.length > 0) ? game.publishers.join(", ") : "N/A";
    const tagsCsv = (game.tags && game.tags.length > 0) ? game.tags.join(", ") : "";

    const userNotes = game.userNotes || "";
    const linksList = this.formatLinksList(game.links);
    const linksCsv = game.links && game.links.length > 0 ? game.links.join(", ") : "";

    const variables: Record<string, string> = {
      title: game.title || "",
      original_title: game.originalTitle || game.title || "",
      type: game.type || "game",
      slug: game.slug || "",
      released: released,
      release_date: released,
      year: year,
      rating: rawRating,
      rating_display: ratingDisplay,
      rating_formatted: ratingDisplay,
      metacritic: metacritic,
      metacritic_display: metacriticDisplay,
      playtime: playtime,
      status: status,
      user_status: status,
      user_playtime: userPlaytime,
      user_rating: userRating,
      user_review: game.userReview || "",
      user_notes: userNotes,
      notes: userNotes,
      links: linksCsv,
      links_list: linksList,
      links_csv: linksCsv,
      version: game.userVersion || "",
      user_version: game.userVersion || "",
      played_version: game.userVersion || "",
      user_platform: game.userPlatform || "",
      platform_played: game.userPlatform || "",
      played_platform: game.userPlatform || "",
      platform: game.userPlatform || (game.platforms && game.platforms.length > 0 ? game.platforms[0] : ""),
      start_date: game.userStartDate || "",
      started: game.userStartDate || "",
      user_start_date: game.userStartDate || "",
      end_date: game.userEndDate || "",
      finished: game.userEndDate || "",
      user_end_date: game.userEndDate || "",
      days_to_beat: daysToBeatStr,
      days_to_beat_raw: daysToBeatRaw,
      days_to_beat_display: daysToBeatDisplay,
      play_duration_days: daysToBeatStr,
      hltb_main: hltbMain,
      hltb_extra: hltbExtra,
      hltb_completionist: hltbCompletionist,
      description: game.description || "",
      short_description: game.shortDescription || "",
      cover: coverUrl,
      banner: bannerUrl,
      website: game.website || "",
      esrb: game.esrbRating || "",
      steam_id: game.steamId || "",
      vndb_id: game.vndbId || "",
      genres: genresCsv,
      genres_csv: genresCsv,
      platforms: platformsCsv,
      platforms_csv: platformsCsv,
      developers: developersCsv,
      developers_csv: developersCsv,
      publishers: publishersCsv,
      publishers_csv: publishersCsv,
      tags: tagsCsv,
      tags_csv: tagsCsv,
    };

    let result = template;

    // Replace standard {{key}} placeholders
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      result = result.replace(regex, val);
    }

    // Clean up any legacy template artifacts
    result = result.replace(/\s*\(\s*Metacritic:\s*\)/gi, "");
    result = result.replace(/(\*\*Rating\*\*:\s*)\/5/gi, `$1${ratingDisplay}`);
    result = result.replace(/(Rating:\s*)\/5/gi, `$1${ratingDisplay}`);

    return result;
  }

  /**
   * Resolve banner image URL based on user settings preference.
   */
  static resolveBannerUrl(game: GameMetadata, settings: GameMetadataPluginSettings): string {
    if (settings.bannerSource === "screenshot" && game.screenshots && game.screenshots.length > 0) {
      return game.screenshots[0];
    }
    if (settings.bannerSource === "cover") {
      return game.coverImage || "";
    }
    return game.bannerImage || game.coverImage || "";
  }

  /**
   * Generate sanitized filename from format string.
   */
  static formatFileName(game: GameMetadata, format: string): string {
    let name = format;
    const year = game.releaseYear || (game.releaseDate ? game.releaseDate.substring(0, 4) : "");

    name = name.replace(/{{\s*title\s*}}/gi, game.title || "Untitled Game");
    name = name.replace(/{{\s*original_title\s*}}/gi, game.originalTitle || game.title || "");
    name = name.replace(/{{\s*year\s*}}/gi, year);
    name = name.replace(/{{\s*released\s*}}/gi, game.releaseDate || "");

    return this.sanitizeFileName(name);
  }

  /**
   * Compute relative subfolder path based on settings.
   */
  static resolveSubfolder(game: GameMetadata, settings: GameMetadataPluginSettings): string {
    const org = settings.subfolderOrganization;
    if (org === "none") return "";

    const status = game.userStatus || settings.defaultPlayStatus || "Backlog";
    const developer = game.developers && game.developers.length > 0 ? game.developers[0] : "Unknown Developer";
    const genre = game.genres && game.genres.length > 0 ? game.genres[0] : "Uncategorized";

    if (org === "status") {
      return this.sanitizeFolderName(status);
    }
    if (org === "developer") {
      return this.sanitizeFolderName(developer);
    }
    if (org === "genre") {
      return this.sanitizeFolderName(genre);
    }
    if (org === "custom" && settings.customSubfolderPattern) {
      let custom = settings.customSubfolderPattern;
      custom = custom.replace(/{{\s*status\s*}}/gi, status);
      custom = custom.replace(/{{\s*developer\s*}}/gi, developer);
      custom = custom.replace(/{{\s*genre\s*}}/gi, genre);
      custom = custom.replace(/{{\s*year\s*}}/gi, game.releaseYear || "");
      
      const segments = custom.split("/").map((s) => this.sanitizeFolderName(s)).filter(Boolean);
      return segments.join("/");
    }

    return "";
  }

  static sanitizeFileName(name: string): string {
    return name
      .replace(/[\\/:*?"<>|#^[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  static sanitizeFolderName(name: string): string {
    return name
      .replace(/[*?"<>|#^[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}
