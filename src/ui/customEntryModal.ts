import { App, Modal, Setting, Notice } from "obsidian";
import { GameMetadata, MediaType, PlayStatus, GameMetadataPluginSettings } from "../models/game";
import { FileService } from "../services/fileService";
import { TemplateEngine } from "../services/templateEngine";

export class CustomEntryModal extends Modal {
  private fileService: FileService;
  private settings: GameMetadataPluginSettings;

  // Core Metadata Fields
  private mediaTypeVal: MediaType = "game";
  private titleVal = "";
  private originalTitleVal = "";
  private releaseDateVal = "";
  private genresVal = "";
  private platformsVal = "";
  private developersVal = "";
  private publishersVal = "";
  private coverVal = "";
  private bannerVal = "";
  private descriptionVal = "";

  // Personal Stats Fields
  private statusVal: PlayStatus;
  private userPlatformVal = "";
  private userPlaytimeVal = "";
  private userRatingVal = "";
  private startDateVal = "";
  private endDateVal = "";
  private versionVal = "";
  private linksVal = "";
  private notesVal = "";
  private reviewVal = "";
  private durationBadgeEl: HTMLElement | null = null;

  constructor(
    app: App,
    fileService: FileService,
    settings: GameMetadataPluginSettings,
    initialTitle = "",
    initialMediaType: MediaType = "game"
  ) {
    super(app);
    this.fileService = fileService;
    this.settings = settings;
    this.titleVal = initialTitle;
    this.mediaTypeVal = initialMediaType;
    this.statusVal = settings.defaultPlayStatus || "Backlog";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("game-metadata-custom-entry-modal");

    contentEl.createEl("h3", { text: "Create Custom Entry" });
    contentEl.createEl("p", {
      text: "Manually enter details for an indie, unlisted, or custom game or visual novel.",
      cls: "game-metadata-helper-text",
    });

    this.addSectionHeader(contentEl, "Core Details");

    new Setting(contentEl)
      .setName("Entry Type")
      .setDesc("Select whether this entry is a Video Game or Visual Novel.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("game", "Video Game")
          .addOption("visual_novel", "Visual Novel")
          .setValue(this.mediaTypeVal)
          .onChange((val: MediaType) => {
            this.mediaTypeVal = val;
          });
      });

    new Setting(contentEl)
      .setName("Title")
      .setDesc("Primary name of the game or visual novel.")
      .addText((text) => {
        text
          .setPlaceholder("e.g. My Indie Game")
          .setValue(this.titleVal)
          .onChange((val) => {
            this.titleVal = val.trim();
          });
        text.inputEl.focus();
      });

    new Setting(contentEl)
      .setName("Original / Native Title")
      .setDesc("Native or Japanese title (optional).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 原題 (Original Title)")
          .setValue(this.originalTitleVal)
          .onChange((val) => {
            this.originalTitleVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Release Date")
      .setDesc("Release date (YYYY-MM-DD or year).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 2026-03-15")
          .setValue(this.releaseDateVal)
          .onChange((val) => {
            this.releaseDateVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Developers / Creators")
      .setDesc("Developer studios or authors (comma separated).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. Indie Dev Team, Solo Creator")
          .setValue(this.developersVal)
          .onChange((val) => {
            this.developersVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Publishers")
      .setDesc("Publishers or distribution platforms (comma separated).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. Self-published, Itch.io")
          .setValue(this.publishersVal)
          .onChange((val) => {
            this.publishersVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Genres")
      .setDesc("Genres or themes (comma separated).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. RPG, Adventure, Mystery")
          .setValue(this.genresVal)
          .onChange((val) => {
            this.genresVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Platforms")
      .setDesc("Available platforms (comma separated).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. PC, Switch, Android")
          .setValue(this.platformsVal)
          .onChange((val) => {
            this.platformsVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Cover Image URL")
      .setDesc("Direct link to cover/poster image.")
      .addText((text) => {
        text
          .setPlaceholder("https://example.com/cover.jpg")
          .setValue(this.coverVal)
          .onChange((val) => {
            this.coverVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Banner Image URL")
      .setDesc("Direct link to banner/header image (optional).")
      .addText((text) => {
        text
          .setPlaceholder("https://example.com/banner.jpg")
          .setValue(this.bannerVal)
          .onChange((val) => {
            this.bannerVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Description / Summary")
      .setDesc("Overview or plot synopsis.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("Write or paste game synopsis here...")
          .setValue(this.descriptionVal)
          .onChange((val) => {
            this.descriptionVal = val.trim();
          });
        textArea.inputEl.rows = 3;
        textArea.inputEl.style.width = "100%";
      });

    this.addSectionHeader(contentEl, "Personal Gameplay Stats");

    new Setting(contentEl)
      .setName("Play Status")
      .setDesc("Current backlog / playthrough status.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("Wishlist", "Wishlist")
          .addOption("Backlog", "Backlog")
          .addOption("Playing", "Playing")
          .addOption("Completed", "Completed")
          .addOption("Dropped", "Dropped")
          .addOption("On Hold", "On Hold")
          .setValue(this.statusVal)
          .onChange((val: PlayStatus) => {
            this.statusVal = val;
          });
      });

    new Setting(contentEl)
      .setName("Platform Played")
      .setDesc("The specific platform or device you played on.")
      .addText((text) => {
        text
          .setPlaceholder("e.g. PC, Switch, Steam Deck")
          .setValue(this.userPlatformVal)
          .onChange((val) => {
            this.userPlatformVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Your Playtime")
      .setDesc("Time you've played (e.g., '25 hrs', '45h 30m').")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 25 hrs")
          .setValue(this.userPlaytimeVal)
          .onChange((val) => {
            this.userPlaytimeVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Your Rating")
      .setDesc("Personal score (e.g., '9/10', '8.5').")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 8.5/10")
          .setValue(this.userRatingVal)
          .onChange((val) => {
            this.userRatingVal = val.trim();
          });
      });

    const getTodayIso = () => new Date().toISOString().split("T")[0];

    const startSetting = new Setting(contentEl)
      .setName("Date Started")
      .setDesc("When you began playing (YYYY-MM-DD).")
      .addText((text) => {
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.startDateVal)
          .onChange((val) => {
            this.startDateVal = val.trim();
            this.updateDurationBadge();
          });
      })
      .addExtraButton((btn) => {
        btn.setIcon("calendar")
          .setTooltip("Set to Today")
          .onClick(() => {
            const today = getTodayIso();
            this.startDateVal = today;
            const inputEl = startSetting.controlEl.querySelector("input");
            if (inputEl) inputEl.value = today;
            this.updateDurationBadge();
          });
      });

    const endSetting = new Setting(contentEl)
      .setName("Date Finished")
      .setDesc("When you completed / finished playing (YYYY-MM-DD).")
      .addText((text) => {
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.endDateVal)
          .onChange((val) => {
            this.endDateVal = val.trim();
            this.updateDurationBadge();
          });
      })
      .addExtraButton((btn) => {
        btn.setIcon("calendar")
          .setTooltip("Set to Today")
          .onClick(() => {
            const today = getTodayIso();
            this.endDateVal = today;
            const inputEl = endSetting.controlEl.querySelector("input");
            if (inputEl) inputEl.value = today;
            this.updateDurationBadge();
          });
      });

    this.durationBadgeEl = contentEl.createDiv({ cls: "game-metadata-helper-text" });
    this.durationBadgeEl.style.marginLeft = "12px";
    this.durationBadgeEl.style.marginTop = "-4px";
    this.durationBadgeEl.style.marginBottom = "12px";
    this.updateDurationBadge();

    new Setting(contentEl)
      .setName("Version / Edition Played")
      .setDesc("Release version, patch, or edition.")
      .addText((text) => {
        text
          .setPlaceholder("e.g. v1.0, Fan Translation Patch")
          .setValue(this.versionVal)
          .onChange((val) => {
            this.versionVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Links")
      .setDesc("URLs for this entry (one URL per line).")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("https://...\nhttps://...")
          .setValue(this.linksVal)
          .onChange((val) => {
            this.linksVal = val;
          });
        textArea.inputEl.rows = 2;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(contentEl)
      .setName("Personal Notes")
      .setDesc("Markdown notes, guides, achievements, or memos.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("Markdown notes or memos...")
          .setValue(this.notesVal)
          .onChange((val) => {
            this.notesVal = val;
          });
        textArea.inputEl.rows = 3;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(contentEl)
      .setName("Your Review / Thoughts")
      .setDesc("Personal review or thoughts.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("Write your thoughts or review here...")
          .setValue(this.reviewVal)
          .onChange((val) => {
            this.reviewVal = val.trim();
          });
        textArea.inputEl.rows = 3;
        textArea.inputEl.style.width = "100%";
      });

    const buttonRow = contentEl.createDiv({ cls: "modal-button-container" });
    const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => {
      this.close();
    };

    const submitBtn = buttonRow.createEl("button", {
      text: "Create Note",
      cls: "mod-cta",
    });
    submitBtn.onclick = async () => {
      if (!this.titleVal) {
        new Notice("Please enter a title for the custom entry.");
        return;
      }

      this.close();
      await this.saveCustomGame();
    };
  }

  private async saveCustomGame() {
    const genres = this.genresVal
      ? this.genresVal.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const platforms = this.platformsVal
      ? this.platformsVal.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const developers = this.developersVal
      ? this.developersVal.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const publishers = this.publishersVal
      ? this.publishersVal.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const links = this.linksVal
      ? this.linksVal.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [];

    const game: GameMetadata = {
      id: `custom-${Date.now()}`,
      title: this.titleVal,
      originalTitle: this.originalTitleVal || undefined,
      type: this.mediaTypeVal,
      releaseDate: this.releaseDateVal || undefined,
      releaseYear: this.releaseDateVal ? this.releaseDateVal.substring(0, 4) : undefined,
      description: this.descriptionVal || undefined,
      coverImage: this.coverVal || undefined,
      bannerImage: this.bannerVal || undefined,
      genres: genres,
      platforms: platforms,
      developers: developers,
      publishers: publishers,
      userStatus: this.statusVal,
      userPlatform: this.userPlatformVal || undefined,
      userPlaytime: this.userPlaytimeVal || undefined,
      userRating: this.userRatingVal || undefined,
      userStartDate: this.startDateVal || undefined,
      userEndDate: this.endDateVal || undefined,
      daysToBeat: TemplateEngine.calculateDaysBetween(this.startDateVal, this.endDateVal),
      userVersion: this.versionVal || undefined,
      userReview: this.reviewVal || undefined,
      userNotes: this.notesVal || undefined,
      links: links.length > 0 ? links : undefined,
      rawProvider: "vndb" as any, // fallback
    };

    await this.fileService.createGameNote(game);
  }

  private updateDurationBadge() {
    if (!this.durationBadgeEl) return;

    if (!this.startDateVal || !this.endDateVal) {
      this.durationBadgeEl.setText("");
      return;
    }

    const days = TemplateEngine.calculateDaysBetween(this.startDateVal, this.endDateVal);
    if (days === undefined) {
      const s = new Date(this.startDateVal);
      const e = new Date(this.endDateVal);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) {
        this.durationBadgeEl.setText("Finish date is earlier than start date.");
        this.durationBadgeEl.style.color = "var(--text-error)";
      } else {
        this.durationBadgeEl.setText("");
      }
      return;
    }

    this.durationBadgeEl.style.color = "var(--text-accent)";
    if (days === 0) {
      this.durationBadgeEl.setText("Calculated Duration: 0 days (Completed on the same day)");
    } else if (days === 1) {
      this.durationBadgeEl.setText("Calculated Duration: 1 day");
    } else {
      this.durationBadgeEl.setText(`Calculated Duration: ${days} days`);
    }
  }

  private addSectionHeader(containerEl: HTMLElement, title: string) {
    containerEl.createEl("div", {
      text: title,
      cls: "game-metadata-settings-section-header",
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
