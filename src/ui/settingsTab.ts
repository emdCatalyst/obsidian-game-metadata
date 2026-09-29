import { App, PluginSettingTab, Setting, Notice, requestUrl } from "obsidian";
import type GameMetadataPlugin from "../main";
import { PlayStatus, SubfolderOrganization, DEFAULT_NOTE_TEMPLATE } from "../models/game";

export class GameMetadataSettingTab extends PluginSettingTab {
  plugin: GameMetadataPlugin;

  constructor(app: App, plugin: GameMetadataPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Game Metadata Plugin Settings" });

    // -------------------------------------------------------------
    // Provider & API Keys
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "API & Data Providers");

    new Setting(containerEl)
      .setName("Primary Provider (Video Games)")
      .setDesc("Choose default video game database. Note: Visual Novels always use VNDB.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("rawg", "RAWG Video Games Database (Recommended)")
          .addOption("steam", "Steam Store (Zero Setup)")
          .setValue(this.plugin.settings.primaryProvider)
          .onChange(async (value: "rawg" | "steam") => {
            this.plugin.settings.primaryProvider = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("RAWG API Key")
      .setDesc("Required for RAWG searches (Free key at https://rawg.io/apidocs). Leave empty to use Steam.")
      .addText((text) => {
        text
          .setPlaceholder("Enter RAWG API Key...")
          .setValue(this.plugin.settings.rawgApiKey)
          .onChange(async (value) => {
            this.plugin.settings.rawgApiKey = value.trim();
            this.plugin.updateProviderApiKey();
            await this.plugin.saveSettings();
          });
      });

    // Test RAWG API Key button
    const testSetting = new Setting(containerEl)
      .setName("Test RAWG API Connection")
      .setDesc("Verify that your RAWG API key is active and communicating with the database.")
      .addButton((button) => {
        button.setButtonText("Test RAWG Key").onClick(async () => {
          const key = this.plugin.settings.rawgApiKey.trim();
          if (!key) {
            new Notice("Please enter a RAWG API key before testing.");
            return;
          }

          button.setButtonText("Testing...").setDisabled(true);

          try {
            const res = await requestUrl({
              url: `https://api.rawg.io/api/games?key=${key}&page_size=1`,
              method: "GET",
              headers: { "User-Agent": "ObsidianGameMetadataPlugin/1.0" },
            });

            if (res.status === 200 && res.json?.results) {
              new Notice("RAWG API key is valid and connected successfully!");
              button.setButtonText("Connected");
            } else {
              new Notice(`RAWG responded with status: ${res.status}`);
              button.setButtonText("Failed");
            }
          } catch (error) {
            new Notice(`Connection failed: ${error.message}`);
            button.setButtonText("Failed");
          } finally {
            setTimeout(() => {
              button.setButtonText("Test RAWG Key").setDisabled(false);
            }, 3000);
          }
        });
      });

    // -------------------------------------------------------------
    // Folder Structure & Subfolder Organization
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "Note Storage & Folder Structure");

    new Setting(containerEl)
      .setName("Games Folder")
      .setDesc("Root folder for video game notes.")
      .addText((text) => {
        text
          .setPlaceholder("Games")
          .setValue(this.plugin.settings.notesFolder)
          .onChange(async (value) => {
            this.plugin.settings.notesFolder = value.trim() || "Games";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Separate Visual Novels Folder")
      .setDesc("Store visual novel notes in a distinct folder.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.separateVnFolder)
          .onChange(async (value) => {
            this.plugin.settings.separateVnFolder = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide vn folder field
          });
      });

    if (this.plugin.settings.separateVnFolder) {
      new Setting(containerEl)
        .setName("Visual Novels Folder")
        .setDesc("Destination folder for visual novels (e.g. 'Games/Visual Novels' or 'Visual Novels').")
        .addText((text) => {
          text
            .setPlaceholder("Games/Visual Novels")
            .setValue(this.plugin.settings.vnNotesFolder)
            .onChange(async (value) => {
              this.plugin.settings.vnNotesFolder = value.trim() || "Games/Visual Novels";
              await this.plugin.saveSettings();
            });
        });
    }

    new Setting(containerEl)
      .setName("Subfolder Organization")
      .setDesc("Automatically place notes into subfolders inside the destination folder.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", "None (Flat folder)")
          .addOption("status", "By Status (e.g. Games/Playing/Game.md)")
          .addOption("developer", "By Developer (e.g. Games/FromSoftware/Game.md)")
          .addOption("genre", "By Primary Genre (First genre, e.g. Games/RPG/Game.md)")
          .addOption("custom", "Custom Pattern (e.g. {{status}}/{{developer}})")
          .setValue(this.plugin.settings.subfolderOrganization)
          .onChange(async (value: SubfolderOrganization) => {
            this.plugin.settings.subfolderOrganization = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.subfolderOrganization === "custom") {
      new Setting(containerEl)
        .setName("Custom Subfolder Pattern")
        .setDesc("Variables: {{status}}, {{developer}}, {{genre}}, {{year}}")
        .addText((text) => {
          text
            .setPlaceholder("{{status}}/{{developer}}")
            .setValue(this.plugin.settings.customSubfolderPattern)
            .onChange(async (value) => {
              this.plugin.settings.customSubfolderPattern = value.trim() || "{{status}}";
              await this.plugin.saveSettings();
            });
        });
    }

    new Setting(containerEl)
      .setName("File Name Format")
      .setDesc("Format for note filenames. Variables: {{title}}, {{year}}, {{released}}")
      .addText((text) => {
        text
          .setPlaceholder("{{title}}")
          .setValue(this.plugin.settings.fileNameFormat)
          .onChange(async (value) => {
            this.plugin.settings.fileNameFormat = value.trim() || "{{title}}";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Open Note After Creation")
      .setDesc("Automatically open newly created notes in active workspace.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.openNoteAfterCreation)
          .onChange(async (value) => {
            this.plugin.settings.openNoteAfterCreation = value;
            await this.plugin.saveSettings();
          });
      });

    // -------------------------------------------------------------
    // HowLongToBeat & Playtime Integration
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "HowLongToBeat & Playtime");

    new Setting(containerEl)
      .setName("Fetch HowLongToBeat Stats")
      .setDesc("Automatically fetch Main Story, Extra, and Completionist hours from HowLongToBeat.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.fetchHltb)
          .onChange(async (value) => {
            this.plugin.settings.fetchHltb = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Prompt for Personal Gameplay Stats")
      .setDesc("Show a quick dialog to enter your own playtime, rating, and status when creating notes.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.promptForUserStats)
          .onChange(async (value) => {
            this.plugin.settings.promptForUserStats = value;
            await this.plugin.saveSettings();
          });
      });

    // -------------------------------------------------------------
    // Banner Plugin Integration
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "Banner Plugin Integration");

    new Setting(containerEl)
      .setName("Enable Banner Integration")
      .setDesc("Populate frontmatter properties compatible with the Obsidian Banners plugin.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableBanner)
          .onChange(async (value) => {
            this.plugin.settings.enableBanner = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Banner Property Key")
      .setDesc("Frontmatter property key for banner image URL (default: 'banner').")
      .addText((text) => {
        text
          .setPlaceholder("banner")
          .setValue(this.plugin.settings.bannerProperty)
          .onChange(async (value) => {
            this.plugin.settings.bannerProperty = value.trim() || "banner";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Banner Image Source")
      .setDesc("Which image to use as the note banner.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("background", "Hero Background Artwork / Screenshot")
          .addOption("screenshot", "High-res Screenshot")
          .addOption("cover", "Game Cover / Boxart")
          .setValue(this.plugin.settings.bannerSource)
          .onChange(async (value: "background" | "screenshot" | "cover") => {
            this.plugin.settings.bannerSource = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Banner Y-Offset (banner_y)")
      .setDesc("Default vertical alignment for banner (0.0 to 1.0, 0.5 is centered).")
      .addSlider((slider) => {
        slider
          .setLimits(0.0, 1.0, 0.05)
          .setValue(this.plugin.settings.bannerYOffset)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.bannerYOffset = value;
            await this.plugin.saveSettings();
          });
      });

    // -------------------------------------------------------------
    // Dataview & Properties Integration
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "Dataview & Frontmatter Properties");

    new Setting(containerEl)
      .setName("Default Play Status")
      .setDesc("Initial game backlog / play status.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("Wishlist", "Wishlist")
          .addOption("Backlog", "Backlog")
          .addOption("Playing", "Playing")
          .addOption("Completed", "Completed")
          .addOption("Dropped", "Dropped")
          .addOption("On Hold", "On Hold")
          .setValue(this.plugin.settings.defaultPlayStatus)
          .onChange(async (value: PlayStatus) => {
            this.plugin.settings.defaultPlayStatus = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Include Dataview Inline Fields")
      .setDesc("Add inline Dataview syntax (e.g. 'Item:: [[Title]]', 'Status:: Backlog') at note top.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeDataviewInlineFields)
          .onChange(async (value) => {
            this.plugin.settings.includeDataviewInlineFields = value;
            await this.plugin.saveSettings();
          });
      });

    // -------------------------------------------------------------
    // Note Body Template Customizer
    // -------------------------------------------------------------
    this.addSectionHeader(containerEl, "Custom Note Template");

    containerEl.createDiv({
      cls: "game-metadata-helper-text",
      text: "Variables: {{title}}, {{original_title}}, {{type}}, {{released}}, {{year}}, {{genres_csv}}, {{platforms_csv}}, {{developers_csv}}, {{publishers_csv}}, {{cover}}, {{banner}}, {{rating_display}}, {{rating}}, {{metacritic_display}}, {{hltb_main}}, {{hltb_extra}}, {{hltb_completionist}}, {{user_playtime}}, {{user_rating}}, {{user_platform}}, {{version}}, {{start_date}}, {{end_date}}, {{days_to_beat}}, {{days_to_beat_display}}, {{user_review}}, {{notes}}, {{links_list}}, {{description}}, {{status}}, {{steam_id}}, {{vndb_id}}, {{website}}, {{esrb}}",
    });

    new Setting(containerEl)
      .setName("Markdown Body Template")
      .setDesc("Leave empty to always use the built-in default template, or enter your own custom markdown layout.")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder(DEFAULT_NOTE_TEMPLATE)
          .setValue(this.plugin.settings.customNoteTemplate)
          .onChange(async (value) => {
            this.plugin.settings.customNoteTemplate = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.addClass("game-metadata-settings-textarea");
      });

    new Setting(containerEl)
      .setName("Reset Template to Default")
      .setDesc("Clear custom layout to use the latest built-in default template.")
      .addButton((button) => {
        button.setButtonText("Reset Template").onClick(async () => {
          this.plugin.settings.customNoteTemplate = "";
          await this.plugin.saveSettings();
          this.display();
          new Notice("Template reset to built-in default!");
        });
      });
  }

  private addSectionHeader(containerEl: HTMLElement, title: string) {
    containerEl.createEl("div", {
      text: title,
      cls: "game-metadata-settings-section-header",
    });
  }
}
