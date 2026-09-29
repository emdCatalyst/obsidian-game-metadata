import { parseYaml, stringifyYaml } from "obsidian";
import {
  GameMetadata,
  GameMetadataPluginSettings,
  DEFAULT_FRONTMATTER_KEYS,
  DEFAULT_NOTE_TEMPLATE,
} from "../models/game";
import { TemplateEngine } from "./templateEngine";

export class NoteBuilder {
  /**
   * Build complete note content (YAML frontmatter + Markdown body) for a game/visual novel.
   */
  static buildNewNoteContent(game: GameMetadata, settings: GameMetadataPluginSettings): string {
    const frontmatterObj = this.buildFrontmatterObject(game, settings);
    const yamlString = stringifyYaml(frontmatterObj);
    const templateStr =
      settings.customNoteTemplate && settings.customNoteTemplate.trim().length > 0
        ? settings.customNoteTemplate
        : DEFAULT_NOTE_TEMPLATE;
    const bodyContent = TemplateEngine.render(templateStr, game, settings);

    let dataviewInline = "";
    if (settings.includeDataviewInlineFields) {
      dataviewInline = this.buildDataviewInlineBlock(game, settings);
    }

    return `---\n${yamlString}---\n\n${dataviewInline}${bodyContent}`;
  }

  /**
   * Re-render complete note content (YAML frontmatter + Markdown body) from the active template,
   * merging any custom non-plugin YAML frontmatter properties from existing note content.
   */
  static renderNoteFromTemplate(
    existingContent: string,
    game: GameMetadata,
    settings: GameMetadataPluginSettings
  ): string {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = existingContent.match(frontmatterRegex);

    let existingProps: Record<string, any> = {};
    if (match) {
      try {
        existingProps = parseYaml(match[1]) || {};
      } catch (e) {
        console.warn("[GameMetadata] Failed to parse existing YAML:", e);
      }
    }

    const newFrontmatterProps = this.buildFrontmatterObject(game, settings);
    const mergedProps = Object.assign({}, existingProps, newFrontmatterProps);

    // Clean any empty or undefined properties
    for (const [k, v] of Object.entries(mergedProps)) {
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        delete mergedProps[k];
      }
    }

    const yamlString = stringifyYaml(mergedProps);
    const templateStr =
      settings.customNoteTemplate && settings.customNoteTemplate.trim().length > 0
        ? settings.customNoteTemplate
        : DEFAULT_NOTE_TEMPLATE;
    const bodyContent = TemplateEngine.render(templateStr, game, settings);

    let dataviewInline = "";
    if (settings.includeDataviewInlineFields) {
      dataviewInline = this.buildDataviewInlineBlock(game, settings);
    }

    return `---\n${yamlString}---\n\n${dataviewInline}${bodyContent}`;
  }

  /**
   * Update an existing note by re-rendering its frontmatter and body from template.
   */
  static updateExistingNoteContent(
    existingContent: string,
    game: GameMetadata,
    settings: GameMetadataPluginSettings
  ): string {
    return this.renderNoteFromTemplate(existingContent, game, settings);
  }

  /**
   * Construct structured frontmatter properties for Banner, Dataview, and Obsidian Properties.
   */
  static buildFrontmatterObject(
    game: GameMetadata,
    settings: GameMetadataPluginSettings
  ): Record<string, any> {
    // Ensure all keys are defined with safe fallbacks
    const keys = Object.assign({}, DEFAULT_FRONTMATTER_KEYS, settings.customFrontmatterKeys);
    const result: Record<string, any> = {};

    // Set property helper
    const setProp = (keyName: string | undefined, val: any) => {
      if (!keyName || keyName === "undefined" || val === undefined || val === null || val === "") return;
      result[keyName] = val;
    };

    if (settings.enableBanner) {
      const bannerUrl = TemplateEngine.resolveBannerUrl(game, settings);
      if (bannerUrl) {
        setProp(settings.bannerProperty || "banner", bannerUrl);
        if (settings.bannerYOffset !== undefined) {
          setProp("banner_y", settings.bannerYOffset);
        }
      }
    }

    if (game.id !== undefined) setProp(keys.id, game.id);
    if (game.title) setProp(keys.title, game.title);
    if (game.originalTitle && game.originalTitle !== game.title) {
      setProp(keys.originalTitle, game.originalTitle);
    }
    if (game.slug) setProp(keys.slug, game.slug);
    setProp(keys.type, game.type || "game");

    if (game.releaseDate) setProp(keys.released, game.releaseDate);
    if (game.releaseYear) setProp(keys.year, game.releaseYear);
    if (game.genres && game.genres.length > 0) setProp(keys.genres, game.genres);
    if (game.platforms && game.platforms.length > 0) setProp(keys.platforms, game.platforms);
    if (game.developers && game.developers.length > 0) setProp(keys.developers, game.developers);
    if (game.publishers && game.publishers.length > 0) setProp(keys.publishers, game.publishers);
    if (game.rating !== undefined) setProp(keys.rating, game.rating);
    if (game.metacritic !== undefined) setProp(keys.metacritic, game.metacritic);
    
    const statusVal = game.userStatus || settings.defaultPlayStatus || "Backlog";
    setProp(keys.status, statusVal);

    if (game.hltbMain !== undefined) setProp(keys.hltbMain, game.hltbMain);
    if (game.hltbMainExtra !== undefined) setProp(keys.hltbExtra, game.hltbMainExtra);
    if (game.hltbCompletionist !== undefined) setProp(keys.hltbCompletionist, game.hltbCompletionist);
    if (game.playtime !== undefined) setProp(keys.playtime, game.playtime);
    if (game.userPlaytime) setProp(keys.userPlaytime, game.userPlaytime);

    if (game.userRating) setProp(keys.userRating, game.userRating);
    if (game.userPlatform) setProp(keys.userPlatform, game.userPlatform);
    if (game.userVersion) setProp(keys.userVersion, game.userVersion);
    if (game.userStartDate) setProp(keys.startDate, game.userStartDate);
    if (game.userEndDate) setProp(keys.endDate, game.userEndDate);
    const daysCalc =
      game.daysToBeat !== undefined
        ? game.daysToBeat
        : TemplateEngine.calculateDaysBetween(game.userStartDate, game.userEndDate);
    if (daysCalc !== undefined) {
      setProp(keys.daysToBeat, daysCalc);
    }

    if (game.links && game.links.length > 0) setProp(keys.links, game.links);
    if (game.userNotes) setProp(keys.notes, game.userNotes);
    if (game.userReview) setProp(keys.review, game.userReview);

    if (game.coverImage) setProp(keys.cover, game.coverImage);
    if (game.bannerImage) setProp(keys.banner, game.bannerImage);
    if (game.description) setProp(keys.description, game.description);
    if (game.shortDescription) setProp(keys.shortDescription, game.shortDescription);
    if (game.website) setProp(keys.website, game.website);
    if (game.esrbRating) setProp(keys.esrb, game.esrbRating);
    if (game.steamId !== undefined) setProp(keys.steamId, game.steamId);
    if (game.vndbId) setProp(keys.vndbId, game.vndbId);

    const baseTag = game.type === "visual_novel" ? "visual-novel" : "game";
    const tags = [baseTag, ...(game.tags ? game.tags.filter((t) => t !== baseTag).map((t) => t.toLowerCase().replace(/\s+/g, "-")) : [])];
    setProp(keys.tags, tags);

    return result;
  }

  /**
   * Generate optional Dataview inline fields block.
   */
  static buildDataviewInlineBlock(game: GameMetadata, settings: GameMetadataPluginSettings): string {
    const lines: string[] = [];
    lines.push(`[Item:: [[${game.title}]]]`);
    lines.push(`[Type:: ${game.type || "game"}]`);
    if (game.releaseDate) lines.push(`[Released:: ${game.releaseDate}]`);
    if (game.rating !== undefined) lines.push(`[Score:: ${game.rating}]`);
    if (game.metacritic !== undefined) lines.push(`[Metascore:: ${game.metacritic}]`);
    if (game.hltbMain !== undefined) lines.push(`[Duration:: ${game.hltbMain}h]`);
    if (game.userStartDate) lines.push(`[Started:: ${game.userStartDate}]`);
    if (game.userEndDate) lines.push(`[Finished:: ${game.userEndDate}]`);
    const daysCalc =
      game.daysToBeat !== undefined
        ? game.daysToBeat
        : TemplateEngine.calculateDaysBetween(game.userStartDate, game.userEndDate);
    if (daysCalc !== undefined) lines.push(`[DaysToBeat:: ${daysCalc}]`);
    if (game.userPlaytime) lines.push(`[Playtime:: ${game.userPlaytime}]`);
    if (game.userPlatform) lines.push(`[UserPlatform:: ${game.userPlatform}]`);
    if (game.userVersion) lines.push(`[Version:: ${game.userVersion}]`);
    lines.push(`[Status:: ${game.userStatus || settings.defaultPlayStatus || "Backlog"}]`);
    lines.push("");
    return lines.join("\n");
  }
}
