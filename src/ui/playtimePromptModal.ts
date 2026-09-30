import { App, Modal, Setting } from "obsidian";
import { PlayStatus } from "../models/game";
import { TemplateEngine } from "../services/templateEngine";

export interface UserPlaytimeInput {
  userPlaytime?: string;
  userRating?: string;
  status?: PlayStatus;
  userReview?: string;
  startDate?: string;
  endDate?: string;
  version?: string;
  userPlatform?: string;
  links?: string[];
  userNotes?: string;
}

export class PlaytimePromptModal extends Modal {
  private onSubmit: (input: UserPlaytimeInput) => void;
  private defaultStatus: PlayStatus;
  private playtimeVal = "";
  private ratingVal = "";
  private reviewVal = "";
  private startDateVal = "";
  private endDateVal = "";
  private versionVal = "";
  private platformVal = "";
  private linksVal = "";
  private notesVal = "";
  private statusVal: PlayStatus;
  private gameTitle: string;
  private availablePlatforms: string[];
  private platformInputEl: HTMLInputElement | null = null;
  private durationBadgeEl: HTMLElement | null = null;
  private isEditMode: boolean;

  constructor(
    app: App,
    gameTitle: string,
    defaultStatus: PlayStatus,
    availablePlatforms: string[] = [],
    onSubmit: (input: UserPlaytimeInput) => void,
    initialData?: Partial<UserPlaytimeInput>,
    isEditMode = false
  ) {
    super(app);
    this.gameTitle = gameTitle;
    this.defaultStatus = defaultStatus;
    this.statusVal = initialData?.status || defaultStatus;
    this.availablePlatforms = availablePlatforms;
    this.onSubmit = onSubmit;
    this.isEditMode = isEditMode;

    if (initialData) {
      this.playtimeVal = initialData.userPlaytime || "";
      this.ratingVal = initialData.userRating || "";
      this.startDateVal = initialData.startDate || "";
      this.endDateVal = initialData.endDate || "";
      this.versionVal = initialData.version || "";
      this.platformVal = initialData.userPlatform || "";
      this.reviewVal = initialData.userReview || "";
      this.notesVal = initialData.userNotes || "";
      if (initialData.links && initialData.links.length > 0) {
        this.linksVal = initialData.links.join("\n");
      }
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const headerText = this.isEditMode
      ? `Edit Personal Stats: ${this.gameTitle}`
      : `Game Note Details: ${this.gameTitle}`;
    this.setTitle(headerText);

    if (this.isEditMode) {
      const warningBox = contentEl.createDiv({ cls: "game-metadata-warning-box" });
      warningBox.createEl("strong", { text: "Warning: " });
      warningBox.createSpan({
        text: "Saving changes will re-render the note body from your active template. Any unmapped custom markdown written directly in the note body will be overwritten.",
      });
    } else {
      contentEl.createEl("p", {
        text: "Customize your personal gameplay stats, dates, and review (or press Save to continue).",
        cls: "game-metadata-helper-text",
      });
    }

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
          .setPlaceholder("e.g. PC, Switch, PS5, Steam Deck")
          .setValue(this.platformVal)
          .onChange((val) => {
            this.platformVal = val.trim();
          });
        this.platformInputEl = text.inputEl;
      });

    if (this.availablePlatforms && this.availablePlatforms.length > 0) {
      const pillsContainer = contentEl.createDiv({ cls: "game-metadata-pills-container" });
      pillsContainer.createSpan({ text: "Quick select: ", cls: "game-metadata-pills-label" });

      for (const plat of this.availablePlatforms) {
        const pill = pillsContainer.createEl("button", {
          text: plat,
          cls: "game-metadata-pill-btn",
        });
        pill.type = "button";
        pill.onclick = (e) => {
          e.preventDefault();
          this.platformVal = plat;
          if (this.platformInputEl) {
            this.platformInputEl.value = plat;
          }
        };
      }
    }

    new Setting(contentEl)
      .setName("Your Playtime")
      .setDesc("Time you've played (e.g., '45 hrs', '45h 30m', or leave empty).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 25 hrs")
          .setValue(this.playtimeVal)
          .onChange((val) => {
            this.playtimeVal = val.trim();
          });
        text.inputEl.focus();
      });

    new Setting(contentEl)
      .setName("Your Rating")
      .setDesc("Personal score (e.g., '9/10', '8.5', or leave empty).")
      .addText((text) => {
        text
          .setPlaceholder("e.g. 8.5/10")
          .setValue(this.ratingVal)
          .onChange((val) => {
            this.ratingVal = val.trim();
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

    this.durationBadgeEl = contentEl.createDiv({
      cls: "game-metadata-helper-text game-metadata-duration-badge",
    });
    this.updateDurationBadge();

    new Setting(contentEl)
      .setName("Version / Edition Played")
      .setDesc("Latest played release, edition, fan translation patch, or port.")
      .addText((text) => {
        text
          .setPlaceholder("e.g. Steam v1.2, Fan TL Patch, Switch Remaster")
          .setValue(this.versionVal)
          .onChange((val) => {
            this.versionVal = val.trim();
          });
      });

    new Setting(contentEl)
      .setName("Links")
      .setDesc("URLs for this game (one URL per line). The first link is usually the official source.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("https://...\nhttps://...")
          .setValue(this.linksVal)
          .onChange((val) => {
            this.linksVal = val;
          });
        textArea.inputEl.rows = 2;
        textArea.inputEl.addClass("game-metadata-textarea-full");
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
        textArea.inputEl.addClass("game-metadata-textarea-full");
      });

    new Setting(contentEl)
      .setName("Your Review / Thoughts")
      .setDesc("Personal thoughts, notes, or mini-review for this game.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("Write your thoughts or review here...")
          .setValue(this.reviewVal)
          .onChange((val) => {
            this.reviewVal = val.trim();
          });
        textArea.inputEl.rows = 3;
        textArea.inputEl.addClass("game-metadata-textarea-full");
      });

    const buttonRow = contentEl.createDiv({ cls: "modal-button-container" });
    const cancelBtn = buttonRow.createEl("button", {
      text: this.isEditMode ? "Cancel" : "Skip",
    });
    cancelBtn.onclick = () => {
      this.close();
      if (!this.isEditMode) {
        this.onSubmit({});
      }
    };

    const submitBtn = buttonRow.createEl("button", {
      text: this.isEditMode ? "Save & Re-render" : "Save & Insert",
      cls: "mod-cta",
    });
    submitBtn.onclick = () => {
      this.close();
      const parsedLinks = this.linksVal
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      this.onSubmit({
        userPlaytime: this.playtimeVal,
        userRating: this.ratingVal,
        status: this.statusVal,
        userReview: this.reviewVal,
        startDate: this.startDateVal,
        endDate: this.endDateVal,
        version: this.versionVal,
        userPlatform: this.platformVal,
        links: parsedLinks,
        userNotes: this.notesVal,
      });
    };
  }

  private updateDurationBadge() {
    if (!this.durationBadgeEl) return;

    if (!this.startDateVal || !this.endDateVal) {
      this.durationBadgeEl.setText("");
      this.durationBadgeEl.removeClass("mod-error", "mod-accent");
      return;
    }

    const days = TemplateEngine.calculateDaysBetween(this.startDateVal, this.endDateVal);
    if (days === undefined) {
      // Inverted or invalid
      const s = new Date(this.startDateVal);
      const e = new Date(this.endDateVal);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) {
        this.durationBadgeEl.setText("Finish date is earlier than start date.");
        this.durationBadgeEl.removeClass("mod-accent");
        this.durationBadgeEl.addClass("mod-error");
      } else {
        this.durationBadgeEl.setText("");
        this.durationBadgeEl.removeClass("mod-error", "mod-accent");
      }
      return;
    }

    this.durationBadgeEl.removeClass("mod-error");
    this.durationBadgeEl.addClass("mod-accent");
    if (days === 0) {
      this.durationBadgeEl.setText("Calculated Duration: 0 days (Completed on the same day)");
    } else if (days === 1) {
      this.durationBadgeEl.setText("Calculated Duration: 1 day");
    } else {
      this.durationBadgeEl.setText(`Calculated Duration: ${days} days`);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
