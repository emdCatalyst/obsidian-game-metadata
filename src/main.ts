import { Plugin, MarkdownView, Notice } from "obsidian";
import {
  GameMetadataPluginSettings,
  DEFAULT_SETTINGS,
  DEFAULT_FRONTMATTER_KEYS,
} from "./models/game";
import { GameDataProvider } from "./providers/base";
import { RawgProvider } from "./providers/rawg";
import { SteamProvider } from "./providers/steam";
import { VndbProvider } from "./providers/vndb";
import { FileService } from "./services/fileService";
import { HltbService } from "./services/hltbService";
import { GameSearchModal } from "./ui/gameSearchModal";
import { PlaytimePromptModal } from "./ui/playtimePromptModal";
import { CustomEntryModal } from "./ui/customEntryModal";
import { GameMetadataSettingTab } from "./ui/settingsTab";

export default class GameMetadataPlugin extends Plugin {
  settings: GameMetadataPluginSettings;
  rawgProvider: RawgProvider;
  steamProvider: SteamProvider;
  vndbProvider: VndbProvider;
  fileService: FileService;

  async onload() {
    console.log("[GameMetadata] Loading Game & Visual Novel Metadata plugin");

    HltbService.clearCache();

    await this.loadSettings();

    this.rawgProvider = new RawgProvider(this.settings.rawgApiKey);
    this.steamProvider = new SteamProvider();
    this.vndbProvider = new VndbProvider();

    this.fileService = new FileService(
      this.app,
      this.settings,
      this.rawgProvider,
      this.steamProvider,
      this.vndbProvider
    );

    this.addRibbonIcon("gamepad-2", "Search Video Game (RAWG / Steam)", (evt: MouseEvent) => {
      this.openSearchModal("game");
    });

    this.addRibbonIcon("book-open", "Search Visual Novel (VNDB)", (evt: MouseEvent) => {
      this.openSearchModal("visual_novel");
    });

    this.addCommand({
      id: "search-and-create-game-note",
      name: "Search Video Game (RAWG / Steam)",
      callback: () => {
        this.openSearchModal("game");
      },
    });

    this.addCommand({
      id: "search-and-create-vn-note",
      name: "Search Visual Novel (VNDB)",
      callback: () => {
        this.openSearchModal("visual_novel");
      },
    });

    this.addCommand({
      id: "refresh-active-note-metadata",
      name: "Refresh remote metadata for active note",
      checkCallback: (checking: boolean) => {
        const activeFile =
          this.app.workspace.getActiveFile() ||
          this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
        if (!activeFile || activeFile.extension !== "md") return false;
        if (checking) return true;

        this.fileService.refreshActiveNoteMetadata(activeFile);
        return true;
      },
    });

    this.addCommand({
      id: "edit-active-note-personal-stats",
      name: "Edit personal stats & review for active note",
      checkCallback: (checking: boolean) => {
        const activeFile =
          this.app.workspace.getActiveFile() ||
          this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
        if (!activeFile || activeFile.extension !== "md") return false;
        if (checking) return true;

        this.fileService.extractMetadataFromActiveNote(activeFile).then((res) => {
          if (!res) return;
          new PlaytimePromptModal(
            this.app,
            res.gameTitle,
            res.stats.status || this.settings.defaultPlayStatus,
            res.platforms,
            async (userInput) => {
              await this.fileService.updateActiveNotePersonalStats(userInput, res.file);
            },
            res.stats,
            true
          ).open();
        });
        return true;
      },
    });

    this.addCommand({
      id: "create-custom-game-note",
      name: "Create custom Game note manually",
      callback: () => {
        new CustomEntryModal(this.app, this.fileService, this.settings, "", "game").open();
      },
    });

    this.addCommand({
      id: "create-custom-vn-note",
      name: "Create custom Visual Novel note manually",
      callback: () => {
        new CustomEntryModal(this.app, this.fileService, this.settings, "", "visual_novel").open();
      },
    });

    this.addSettingTab(new GameMetadataSettingTab(this.app, this));
  }

  onunload() {
    console.log("[GameMetadata] Unloading plugin and purging caches");
    HltbService.clearCache();
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    this.settings.customFrontmatterKeys = Object.assign(
      {},
      DEFAULT_FRONTMATTER_KEYS,
      loadedData?.customFrontmatterKeys
    );
  }

  private saveNoticeDebounceTimer: number | null = null;

  async saveSettings(showNotice = true) {
    await this.saveData(this.settings);
    this.updateProviderApiKey();
    this.fileService.updateSettings(this.settings);

    if (showNotice) {
      if (this.saveNoticeDebounceTimer) {
        window.clearTimeout(this.saveNoticeDebounceTimer);
      }
      this.saveNoticeDebounceTimer = window.setTimeout(() => {
        new Notice("Settings saved.", 2000);
      }, 500);
    }
  }

  updateProviderApiKey() {
    if (this.rawgProvider) {
      this.rawgProvider.setApiKey(this.settings.rawgApiKey);
    }
  }

  getActiveGameProvider(): GameDataProvider {
    if (this.settings.primaryProvider === "steam") {
      return this.steamProvider;
    }
    return this.rawgProvider;
  }

  openSearchModal(mediaType: "game" | "visual_novel" = "game") {
    const provider = mediaType === "visual_novel" ? this.vndbProvider : this.getActiveGameProvider();
    new GameSearchModal(this.app, provider, this.fileService, this.settings, mediaType).open();
  }
}
