import { App, TFile, normalizePath, Notice, MarkdownView, parseYaml } from "obsidian";
import { GameMetadata, GameMetadataPluginSettings, DEFAULT_FRONTMATTER_KEYS } from "../models/game";
import { RawgProvider } from "../providers/rawg";
import { SteamProvider } from "../providers/steam";
import { VndbProvider } from "../providers/vndb";
import { HltbService } from "./hltbService";
import { IdentifierService } from "./identifierService";
import { TemplateEngine } from "./templateEngine";
import { NoteBuilder } from "./noteBuilder";

export class FileService {
  private app: App;
  private settings: GameMetadataPluginSettings;
  private rawgProvider?: RawgProvider;
  private steamProvider?: SteamProvider;
  private vndbProvider?: VndbProvider;

  constructor(
    app: App,
    settings: GameMetadataPluginSettings,
    rawgProvider?: RawgProvider,
    steamProvider?: SteamProvider,
    vndbProvider?: VndbProvider
  ) {
    this.app = app;
    this.settings = settings;
    this.rawgProvider = rawgProvider;
    this.steamProvider = steamProvider;
    this.vndbProvider = vndbProvider;
  }

  setProviders(rawg: RawgProvider, steam: SteamProvider, vndb: VndbProvider) {
    this.rawgProvider = rawg;
    this.steamProvider = steam;
    this.vndbProvider = vndb;
  }

  updateSettings(settings: GameMetadataPluginSettings) {
    this.settings = settings;
  }

  /**
   * Determine target directory for a game / visual novel.
   */
  resolveTargetFolder(game: GameMetadata): string {
    let baseFolder = this.settings.notesFolder || "Games";

    if (game.type === "visual_novel" && this.settings.separateVnFolder) {
      baseFolder = this.settings.vnNotesFolder || "Games/Visual Novels";
    }

    const subfolder = TemplateEngine.resolveSubfolder(game, this.settings);
    if (subfolder) {
      return normalizePath(`${baseFolder}/${subfolder}`);
    }

    return normalizePath(baseFolder);
  }

  /**
   * Create a new note from GameMetadata.
   */
  async createGameNote(game: GameMetadata): Promise<TFile | null> {
    const fileName = TemplateEngine.formatFileName(game, this.settings.fileNameFormat);
    const folderPath = this.resolveTargetFolder(game);

    await this.ensureFolderHierarchy(folderPath);

    const fullPath = normalizePath(`${folderPath ? folderPath + "/" : ""}${fileName}.md`);
    const noteContent = NoteBuilder.buildNewNoteContent(game, this.settings);

    const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
    if (existingFile instanceof TFile) {
      new Notice(`Note already exists: "${fullPath}". Updating metadata...`);
      const existingContent = await this.app.vault.read(existingFile);
      const updatedContent = NoteBuilder.updateExistingNoteContent(existingContent, game, this.settings);
      await this.app.vault.modify(existingFile, updatedContent);

      if (this.settings.openNoteAfterCreation) {
        await this.app.workspace.getLeaf(false).openFile(existingFile);
      }
      return existingFile;
    }

    try {
      const newFile = await this.app.vault.create(fullPath, noteContent);
      const typeLabel = game.type === "visual_novel" ? "visual novel" : "game";
      new Notice(`Created ${typeLabel} note: "${fileName}" in [${folderPath}]`);

      if (this.settings.openNoteAfterCreation) {
        await this.app.workspace.getLeaf(false).openFile(newFile);
      }
      return newFile;
    } catch (error) {
      console.error("[GameMetadata] Error creating note:", error);
      new Notice(`Failed to create note: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract complete GameMetadata model from note cache and frontmatter.
   */
  extractFullGameMetadata(file: TFile, content: string): GameMetadata {
    let fm: Record<string, any> = {};
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match) {
      try {
        fm = parseYaml(match[1]) || {};
      } catch (e) {
        console.warn("[GameMetadata] Error parsing frontmatter:", e);
      }
    }
    if (Object.keys(fm).length === 0) {
      const cache = this.app.metadataCache.getFileCache(file);
      fm = cache?.frontmatter || {};
    }

    const keys = Object.assign({}, DEFAULT_FRONTMATTER_KEYS, this.settings.customFrontmatterKeys);

    const getVal = (keyName: string, ...fallbacks: string[]) => {
      if (fm[keyName] !== undefined && fm[keyName] !== null && fm[keyName] !== "") return fm[keyName];
      for (const fb of fallbacks) {
        if (fm[fb] !== undefined && fm[fb] !== null && fm[fb] !== "") return fm[fb];
      }
      return undefined;
    };

    const parseNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === "") return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    const parseStr = (val: any): string | undefined => {
      if (val === undefined || val === null || val === "") return undefined;
      return String(val).trim();
    };

    const parseArr = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const typeVal = parseStr(getVal(keys.type, "type"));
    const mediaType: "game" | "visual_novel" = typeVal === "visual_novel" ? "visual_novel" : "game";

    const userReview = parseStr(getVal(keys.review, "user_review", "review"));
    const userNotes = parseStr(getVal(keys.notes, "user_notes", "notes"));
    const links = parseArr(getVal(keys.links, "links"));

    return {
      id: parseStr(getVal(keys.id, "id")) || file.basename,
      title: parseStr(getVal(keys.title, "title")) || file.basename,
      originalTitle: parseStr(getVal(keys.originalTitle, "original_title")),
      slug: parseStr(getVal(keys.slug, "slug")),
      type: mediaType,
      releaseDate: parseStr(getVal(keys.released, "released", "release_date")),
      releaseYear: parseStr(getVal(keys.year, "year")) || (getVal(keys.released, "released") ? String(getVal(keys.released, "released")).substring(0, 4) : undefined),
      rating: parseNum(getVal(keys.rating, "rating")),
      metacritic: parseNum(getVal(keys.metacritic, "metacritic")),
      hltbMain: parseNum(getVal(keys.hltbMain, "hltb_main")),
      hltbMainExtra: parseNum(getVal(keys.hltbExtra, "hltb_extra")),
      hltbCompletionist: parseNum(getVal(keys.hltbCompletionist, "hltb_completionist")),
      genres: parseArr(getVal(keys.genres, "genres")),
      platforms: parseArr(getVal(keys.platforms, "platforms")),
      developers: parseArr(getVal(keys.developers, "developers")),
      publishers: parseArr(getVal(keys.publishers, "publishers")),
      tags: parseArr(getVal(keys.tags, "tags")),
      coverImage: parseStr(getVal(keys.cover, "cover", "cover_image", "image")),
      bannerImage: parseStr(getVal(keys.banner, "banner", "banner_image", "header_image")),
      website: parseStr(getVal(keys.website, "website")),
      esrbRating: parseStr(getVal(keys.esrb, "esrb", "esrb_rating")),
      steamId: parseStr(getVal(keys.steamId, "steam_id")),
      vndbId: parseStr(getVal(keys.vndbId, "vndb_id")),
      description: parseStr(getVal(keys.description, "description")),
      shortDescription: parseStr(getVal(keys.shortDescription, "short_description")),

      userStatus: (parseStr(getVal(keys.status, "status")) as any) || this.settings.defaultPlayStatus,
      userRating: parseStr(getVal(keys.userRating, "user_rating")),
      userPlatform: parseStr(getVal(keys.userPlatform, "user_platform", "platform_played")),
      userPlaytime: parseStr(getVal(keys.userPlaytime, "user_playtime")),
      userStartDate: parseStr(getVal(keys.startDate, "date_started", "start_date")),
      userEndDate: parseStr(getVal(keys.endDate, "date_finished", "end_date")),
      daysToBeat: parseNum(getVal(keys.daysToBeat, "days_to_beat")),
      userVersion: parseStr(getVal(keys.userVersion, "version")),
      userReview: userReview,
      userNotes: userNotes,
      links: links.length > 0 ? links : undefined,
    };
  }

  /**
   * Extract current game metadata and personal stats from active note.
   */
  async extractMetadataFromActiveNote(targetFile?: TFile): Promise<{
    file: TFile;
    gameTitle: string;
    stats: {
      status?: any;
      userRating?: string;
      userPlatform?: string;
      userPlaytime?: string;
      startDate?: string;
      endDate?: string;
      version?: string;
      userReview?: string;
      userNotes?: string;
      links?: string[];
    };
    platforms: string[];
    mediaType: "game" | "visual_novel";
  } | null> {
    const activeFile =
      targetFile ||
      this.app.workspace.getActiveFile() ||
      this.app.workspace.getActiveViewOfType(MarkdownView)?.file;

    if (!activeFile || activeFile.extension !== "md") {
      new Notice("No active markdown note found.");
      return null;
    }

    try {
      const content = await this.app.vault.read(activeFile);
      const game = this.extractFullGameMetadata(activeFile, content);

      const stats = {
        status: game.userStatus || this.settings.defaultPlayStatus,
        userRating: game.userRating || "",
        userPlatform: game.userPlatform || "",
        userPlaytime: game.userPlaytime || "",
        startDate: game.userStartDate || "",
        endDate: game.userEndDate || "",
        version: game.userVersion || "",
        userReview: game.userReview || "",
        userNotes: game.userNotes || "",
        links: game.links || [],
      };

      return {
        file: activeFile,
        gameTitle: game.title,
        stats,
        platforms: game.platforms || [],
        mediaType: game.type || "game",
      };
    } catch (e) {
      console.error("[GameMetadata] Error extracting metadata:", e);
      return null;
    }
  }

  /**
   * Update personal stats in active note by re-rendering from template and optionally relocate if status folder changed.
   */
  async updateActiveNotePersonalStats(stats: any, targetFile?: TFile): Promise<boolean> {
    const activeFile =
      targetFile ||
      this.app.workspace.getActiveFile() ||
      this.app.workspace.getActiveViewOfType(MarkdownView)?.file;

    if (!activeFile) {
      new Notice("No active markdown note found.");
      return false;
    }

    try {
      const existingContent = await this.app.vault.read(activeFile);
      const game = this.extractFullGameMetadata(activeFile, existingContent);

      if (stats.status) game.userStatus = stats.status;
      if (stats.userRating !== undefined) game.userRating = stats.userRating;
      if (stats.userPlatform !== undefined) game.userPlatform = stats.userPlatform;
      if (stats.userPlaytime !== undefined) {
        game.userPlaytime = stats.userPlaytime;
      }
      if (stats.startDate !== undefined) game.userStartDate = stats.startDate;
      if (stats.endDate !== undefined) game.userEndDate = stats.endDate;
      game.daysToBeat = TemplateEngine.calculateDaysBetween(game.userStartDate, game.userEndDate);
      if (stats.version !== undefined) game.userVersion = stats.version;
      if (stats.userReview !== undefined) game.userReview = stats.userReview;
      if (stats.userNotes !== undefined) game.userNotes = stats.userNotes;
      if (stats.links !== undefined) game.links = stats.links;

      const updatedContent = NoteBuilder.renderNoteFromTemplate(
        existingContent,
        game,
        this.settings
      );
      await this.app.vault.modify(activeFile, updatedContent);

      const targetFolder = this.resolveTargetFolder(game);
      const currentParent = activeFile.parent ? activeFile.parent.path : "";

      if (targetFolder && currentParent !== targetFolder) {
        await this.ensureFolderHierarchy(targetFolder);
        const newPath = normalizePath(`${targetFolder}/${activeFile.name}`);
        if (newPath !== activeFile.path) {
          await this.app.fileManager.renameFile(activeFile, newPath);
          new Notice(`Re-rendered note from template and moved to [${targetFolder}]`);
          return true;
        }
      }

      new Notice(`Re-rendered note from template for "${activeFile.basename}"`);
      return true;
    } catch (error) {
      console.error("[GameMetadata] Error updating personal stats:", error);
      new Notice(`Failed to update personal stats: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh remote metadata for an active note while preserving all personal stats.
   */
  async refreshActiveNoteMetadata(targetFile?: TFile): Promise<boolean> {
    const activeFile =
      targetFile ||
      this.app.workspace.getActiveFile() ||
      this.app.workspace.getActiveViewOfType(MarkdownView)?.file;

    if (!activeFile || activeFile.extension !== "md") {
      new Notice("No active markdown note found.");
      return false;
    }

    const loadingNotice = new Notice(`Refreshing remote metadata for "${activeFile.basename}"...`, 0);

    try {
      const content = await this.app.vault.read(activeFile);
      const existingData = this.extractFullGameMetadata(activeFile, content);

      let fetchedDetails: GameMetadata | null = null;

      if (existingData.type === "visual_novel") {
        const vndb = this.vndbProvider || new VndbProvider();
        let targetId =
          existingData.vndbId ||
          (existingData.id && String(existingData.id).startsWith("v") ? String(existingData.id) : undefined);

        if (!targetId) {
          targetId = IdentifierService.extractVndbIdFromLinks(existingData.links);
        }

        if (targetId) {
          fetchedDetails = await vndb.getDetails(targetId);
        } else {
          const results = await vndb.search(existingData.title);
          if (results.length > 0) {
            fetchedDetails = await vndb.getDetails(results[0].id);
          }
        }

        if (fetchedDetails) {
          fetchedDetails.type = "visual_novel";
        }
      } else {
        const steam = this.steamProvider || new SteamProvider();
        const rawg = this.rawgProvider || new RawgProvider(this.settings.rawgApiKey);
        const primaryProvider =
          this.settings.primaryProvider === "steam" || !this.settings.rawgApiKey.trim() ? steam : rawg;

        let steamId =
          existingData.steamId ||
          (existingData.id && /^\d+$/.test(String(existingData.id)) ? String(existingData.id) : undefined);
        if (!steamId) {
          steamId = IdentifierService.extractSteamIdFromLinks(existingData.links);
        }

        let rawgSlug = existingData.slug;
        if (!rawgSlug) {
          rawgSlug = IdentifierService.extractRawgSlugFromLinks(existingData.links);
        }

        if (steamId && (primaryProvider.id === "steam" || !this.settings.rawgApiKey.trim())) {
          fetchedDetails = await steam.getDetails(steamId);
        } else if (rawgSlug && primaryProvider.id === "rawg") {
          fetchedDetails = await rawg.getDetails(rawgSlug);
        } else if (steamId) {
          fetchedDetails = await steam.getDetails(steamId);
        } else {
          const results = await primaryProvider.search(existingData.title);
          if (results.length > 0) {
            fetchedDetails = await primaryProvider.getDetails(results[0].id);
          }
        }

        if (fetchedDetails && this.settings.fetchHltb) {
          try {
            const hltb = await HltbService.search(fetchedDetails.title);
            if (hltb) {
              fetchedDetails.hltbMain = hltb.gameplayMain;
              fetchedDetails.hltbMainExtra = hltb.gameplayMainExtra;
              fetchedDetails.hltbCompletionist = hltb.gameplayCompletionist;
            }
          } catch (e) {
            console.warn("[GameMetadata] HLTB enrichment error:", e);
          }
        }
      }

      if (!fetchedDetails) {
        loadingNotice.hide();
        new Notice(`Could not find remote metadata for "${existingData.title}".`);
        return false;
      }

      const mergedGame: GameMetadata = {
        ...existingData,
        ...fetchedDetails,
        userStatus: existingData.userStatus || this.settings.defaultPlayStatus,
        userRating: existingData.userRating,
        userPlatform: existingData.userPlatform,
        userPlaytime: existingData.userPlaytime,
        userStartDate: existingData.userStartDate,
        userEndDate: existingData.userEndDate,
        daysToBeat: existingData.daysToBeat,
        userVersion: existingData.userVersion,
        userReview: existingData.userReview,
        userNotes: existingData.userNotes,
        links: [
          ...(fetchedDetails.links || []),
          ...(existingData.links || []).filter((l) => !fetchedDetails?.links?.includes(l)),
        ],
      };

      const updatedContent = NoteBuilder.renderNoteFromTemplate(
        content,
        mergedGame,
        this.settings
      );
      await this.app.vault.modify(activeFile, updatedContent);

      loadingNotice.hide();
      new Notice(`Refreshed remote metadata for "${activeFile.basename}"`);
      return true;
    } catch (error) {
      loadingNotice.hide();
      console.error("[GameMetadata] Error refreshing metadata:", error);
      new Notice(`Failed to refresh metadata: ${error.message}`);
      return false;
    }
  }
  private async ensureFolderHierarchy(folderPath: string) {
    if (!folderPath || folderPath === "/" || folderPath === ".") return;

    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folder = this.app.vault.getAbstractFileByPath(currentPath);
      if (!folder) {
        try {
          await this.app.vault.createFolder(currentPath);
        } catch (e) {
          // Ignore if exists
        }
      }
    }
  }
}
