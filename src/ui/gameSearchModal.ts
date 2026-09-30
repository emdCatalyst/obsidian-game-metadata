import { App, SuggestModal, Notice, setIcon } from "obsidian";
import { GameMetadata, GameMetadataPluginSettings } from "../models/game";
import { GameDataProvider } from "../providers/base";
import { SteamProvider } from "../providers/steam";
import { VndbProvider } from "../providers/vndb";
import { FileService } from "../services/fileService";
import { HltbService } from "../services/hltbService";
import { TemplateEngine } from "../services/templateEngine";
import { PlaytimePromptModal, UserPlaytimeInput } from "./playtimePromptModal";
import { CustomEntryModal } from "./customEntryModal";

export class GameSearchModal extends SuggestModal<GameMetadata> {
  private provider: GameDataProvider;
  private steamFallback: SteamProvider;
  private vndbProvider: VndbProvider;
  private fileService: FileService;
  private settings: GameMetadataPluginSettings;
  private mediaType: "game" | "visual_novel";
  private debounceTimer: number | null = null;

  constructor(
    app: App,
    provider: GameDataProvider,
    fileService: FileService,
    settings: GameMetadataPluginSettings,
    mediaType: "game" | "visual_novel" = "game"
  ) {
    super(app);
    this.provider = provider;
    this.steamFallback = new SteamProvider();
    this.vndbProvider = new VndbProvider();
    this.fileService = fileService;
    this.settings = settings;
    this.mediaType = mediaType;

    this.updatePlaceholder();
    this.emptyStateText = "No results found. Type to search.";
  }

  private updatePlaceholder() {
    if (this.mediaType === "visual_novel") {
      this.setPlaceholder("Search Visual Novel on VNDB (e.g. Steins;Gate, Clannad, Fate/stay night)...");
    } else {
      const providerName = this.getEffectiveProvider().name;
      this.setPlaceholder(`Search Video Game using ${providerName} (e.g., Witcher 3, Elden Ring)...`);
    }
  }

  private getEffectiveProvider(): GameDataProvider {
    if (this.mediaType === "visual_novel") {
      return this.vndbProvider;
    }
    // If RAWG is selected but no key is set, fallback to Steam
    if (this.provider.id === "rawg" && !this.settings.rawgApiKey.trim()) {
      return this.steamFallback;
    }
    return this.provider;
  }

  async getSuggestions(query: string): Promise<GameMetadata[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const activeProvider = this.getEffectiveProvider();

    return new Promise((resolve) => {
      if (this.debounceTimer) {
        window.clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(async () => {
        const customEntryOption: GameMetadata = {
          id: "__custom_entry__",
          title: `Create custom entry for "${trimmed}"...`,
          rawProvider: "vndb" as any,
          type: this.mediaType,
        };
        (customEntryOption as any)._customTitle = trimmed;

        try {
          const results = await activeProvider.search(trimmed);
          resolve([...results, customEntryOption]);
        } catch (error) {
          console.error("[GameMetadata] Search error:", error);
          if (activeProvider.id === "rawg") {
            try {
              new Notice("RAWG search failed. Falling back to Steam Store...", 2000);
              const fallbackResults = await this.steamFallback.search(trimmed);
              resolve([...fallbackResults, customEntryOption]);
              return;
            } catch (fallbackErr) {
              console.error("[GameMetadata] Fallback error:", fallbackErr);
            }
          }
          new Notice(`Search error: ${error.message}`);
          resolve([customEntryOption]);
        }
      }, 350);
    });
  }

  renderSuggestion(game: GameMetadata, el: HTMLElement) {
    el.empty();
    el.addClass("game-metadata-suggest-item");

    if (game.id === "__custom_entry__") {
      const thumbContainer = el.createDiv({ cls: "game-metadata-thumbnail-container" });
      const ph = thumbContainer.createDiv({ cls: "game-metadata-thumbnail-placeholder" });
      setIcon(ph, "plus-circle");

      const infoContainer = el.createDiv({ cls: "game-metadata-info" });
      const titleRow = infoContainer.createDiv({ cls: "game-metadata-title-row" });
      titleRow.createSpan({ text: game.title, cls: "game-metadata-title" });

      const metaRow = infoContainer.createDiv({ cls: "game-metadata-helper-text game-metadata-meta-desc" });
      metaRow.setText("Manually enter custom or unlisted game details");
      return;
    }

    const thumbContainer = el.createDiv({ cls: "game-metadata-thumbnail-container" });
    const createPlaceholder = () => {
      const ph = thumbContainer.createDiv({ cls: "game-metadata-thumbnail-placeholder" });
      setIcon(ph, game.type === "visual_novel" ? "book-open" : "gamepad-2");
    };

    if (game.coverImage) {
      const img = thumbContainer.createEl("img", {
        cls: "game-metadata-thumbnail",
        attr: { src: game.coverImage, alt: game.title, loading: "lazy" },
      });
      img.onerror = () => {
        img.remove();
        createPlaceholder();
      };
    } else {
      createPlaceholder();
    }

    const infoContainer = el.createDiv({ cls: "game-metadata-info" });

    const titleRow = infoContainer.createDiv({ cls: "game-metadata-title-row" });
    titleRow.createSpan({ text: game.title, cls: "game-metadata-title" });
    if (game.releaseYear) {
      titleRow.createSpan({ text: `(${game.releaseYear})`, cls: "game-metadata-year" });
    }

    if (game.originalTitle && game.originalTitle !== game.title) {
      const origRow = infoContainer.createDiv({ cls: "game-metadata-helper-text game-metadata-original-title" });
      origRow.setText(game.originalTitle);
    }

    const metaRow = infoContainer.createDiv({ cls: "game-metadata-meta-row" });

    if (game.type === "visual_novel") {
      metaRow.createSpan({ text: "VNDB", cls: "game-metadata-badge" });
    }

    if (game.metacritic) {
      metaRow.createSpan({
        text: `MC ${game.metacritic}`,
        cls: "game-metadata-rating metacritic",
        attr: { title: "Metacritic Score" },
      });
    } else if (game.rating) {
      const ratingLabel = game.type === "visual_novel" ? `VNDB ${game.rating}/10` : `${game.rating}/5`;
      metaRow.createSpan({
        text: ratingLabel,
        cls: "game-metadata-rating",
        attr: { title: "Rating" },
      });
    }

    if (game.developers && game.developers.length > 0) {
      metaRow.createSpan({
        text: game.developers.slice(0, 2).join(", "),
        cls: "game-metadata-badge",
      });
    } else if (game.platforms && game.platforms.length > 0) {
      const topPlatforms = game.platforms.slice(0, 3).join(", ");
      metaRow.createSpan({
        text: topPlatforms + (game.platforms.length > 3 ? "..." : ""),
        cls: "game-metadata-badge",
      });
    }

    if (game.genres && game.genres.length > 0) {
      metaRow.createSpan({
        text: game.genres.slice(0, 3).join(", "),
        cls: "game-metadata-genres",
      });
    }
  }

  async onChooseSuggestion(game: GameMetadata, evt: MouseEvent | KeyboardEvent) {
    if (game.id === "__custom_entry__") {
      const customTitle = (game as any)._customTitle || "";
      new CustomEntryModal(this.app, this.fileService, this.settings, customTitle, this.mediaType).open();
      return;
    }

    const loadingNotice = new Notice(`Fetching full details for "${game.title}"...`, 0);
    const activeProvider =
      game.rawProvider === "vndb"
        ? this.vndbProvider
        : game.rawProvider === "steam"
        ? this.steamFallback
        : this.getEffectiveProvider();

    try {
      const fullDetails = await activeProvider.getDetails(game.id);
      if (game.type === "visual_novel") {
        fullDetails.type = "visual_novel";
      }

      if (fullDetails.type !== "visual_novel" && this.settings.fetchHltb) {
        try {
          const hltb = await HltbService.search(fullDetails.title);
          if (hltb) {
            fullDetails.hltbMain = hltb.gameplayMain;
            fullDetails.hltbMainExtra = hltb.gameplayMainExtra;
            fullDetails.hltbCompletionist = hltb.gameplayCompletionist;
          }
        } catch (e) {
          console.warn("[GameMetadata] HLTB enrichment error:", e);
        }
      }

      loadingNotice.hide();

      if (this.settings.promptForUserStats) {
        new PlaytimePromptModal(
          this.app,
          fullDetails.title,
          this.settings.defaultPlayStatus,
          fullDetails.platforms || [],
          async (userInput: UserPlaytimeInput) => {
            if (userInput.userPlaytime) {
              fullDetails.userPlaytime = userInput.userPlaytime;
            }
            if (userInput.userRating) fullDetails.userRating = userInput.userRating;
            if (userInput.status) fullDetails.userStatus = userInput.status;
            if (userInput.userPlatform) fullDetails.userPlatform = userInput.userPlatform;
            if (userInput.userReview) fullDetails.userReview = userInput.userReview;
            if (userInput.startDate) fullDetails.userStartDate = userInput.startDate;
            if (userInput.endDate) fullDetails.userEndDate = userInput.endDate;
            if (userInput.version) fullDetails.userVersion = userInput.version;
            if (userInput.links) fullDetails.links = userInput.links;
            if (userInput.userNotes) fullDetails.userNotes = userInput.userNotes;
            fullDetails.daysToBeat = TemplateEngine.calculateDaysBetween(
              fullDetails.userStartDate,
              fullDetails.userEndDate
            );

            await this.fileService.createGameNote(fullDetails);
          },
          {
            links: fullDetails.links,
          },
          false
        ).open();
      } else {
        await this.fileService.createGameNote(fullDetails);
      }
    } catch (error) {
      loadingNotice.hide();
      console.error("[GameMetadata] Error on selection:", error);
      new Notice(`Failed to fetch details: ${error.message}`);
    }
  }
}
