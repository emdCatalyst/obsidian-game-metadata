export type MediaType = "game" | "visual_novel";

export interface GameMetadata {
  id: string | number;
  title: string;
  originalTitle?: string;
  slug?: string;
  type?: MediaType;
  releaseDate?: string;
  releaseYear?: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  bannerImage?: string;
  screenshots?: string[];
  genres?: string[];
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
  rating?: number;
  metacritic?: number;
  esrbRating?: string;
  website?: string;
  steamId?: string;
  vndbId?: string;
  playtime?: number;
  
  hltbMain?: number;
  hltbMainExtra?: number;
  hltbCompletionist?: number;

  userPlaytime?: string;
  userRating?: string;
  userStatus?: string;
  userReview?: string;
  userStartDate?: string;
  userEndDate?: string;
  userVersion?: string;
  userPlatform?: string;
  userNotes?: string;
  links?: string[];
  daysToBeat?: number;

  tags?: string[];
  rawProvider?: "rawg" | "steam" | "igdb" | "vndb";
}

export type PlayStatus = "Wishlist" | "Backlog" | "Playing" | "Completed" | "Dropped" | "On Hold";
export type SubfolderOrganization = "none" | "status" | "developer" | "genre" | "custom";

export interface GameMetadataPluginSettings {
  rawgApiKey: string;
  steamApiKey: string;
  primaryProvider: "rawg" | "steam";
  
  notesFolder: string;
  vnNotesFolder: string;
  separateVnFolder: boolean;
  subfolderOrganization: SubfolderOrganization;
  customSubfolderPattern: string;
  fileNameFormat: string;
  openNoteAfterCreation: boolean;

  fetchHltb: boolean;
  promptForUserStats: boolean;

  enableBanner: boolean;
  bannerProperty: string;
  bannerYOffset: number;
  bannerSource: "background" | "screenshot" | "cover";

  frontmatterDateFormat: string;
  defaultPlayStatus: PlayStatus;
  includeDataviewInlineFields: boolean;
  customFrontmatterKeys: {
    id: string;
    title: string;
    originalTitle: string;
    slug: string;
    type: string;
    released: string;
    year: string;
    genres: string;
    platforms: string;
    developers: string;
    publishers: string;
    rating: string;
    metacritic: string;
    status: string;
    playtime: string;
    userPlaytime: string;
    userRating: string;
    userVersion: string;
    userPlatform: string;
    startDate: string;
    endDate: string;
    daysToBeat: string;
    hltbMain: string;
    hltbExtra: string;
    hltbCompletionist: string;
    cover: string;
    banner: string;
    description: string;
    shortDescription: string;
    website: string;
    esrb: string;
    steamId: string;
    vndbId: string;
    links: string;
    notes: string;
    review: string;
    tags: string;
  };

  customNoteTemplate: string;
}

export const DEFAULT_FRONTMATTER_KEYS = {
  id: "id",
  title: "title",
  originalTitle: "original_title",
  slug: "slug",
  type: "type",
  released: "released",
  year: "year",
  genres: "genres",
  platforms: "platforms",
  developers: "developers",
  publishers: "publishers",
  rating: "rating",
  metacritic: "metacritic",
  status: "status",
  playtime: "playtime",
  userPlaytime: "user_playtime",
  userRating: "user_rating",
  userVersion: "version",
  userPlatform: "user_platform",
  startDate: "date_started",
  endDate: "date_finished",
  daysToBeat: "days_to_beat",
  hltbMain: "hltb_main",
  hltbExtra: "hltb_extra",
  hltbCompletionist: "hltb_completionist",
  cover: "cover",
  banner: "banner",
  description: "description",
  shortDescription: "short_description",
  website: "website",
  esrb: "esrb",
  steamId: "steam_id",
  vndbId: "vndb_id",
  links: "links",
  notes: "notes",
  review: "review",
  tags: "tags",
};

export const DEFAULT_NOTE_TEMPLATE = `> [!info] {{title}}
> ![]({{cover}})
> **Released**: {{released}}
> **Rating**: {{rating_display}}{{metacritic_display}}
> **Genres**: {{genres_csv}}
> **Platforms**: {{platforms_csv}}
> **Developers**: {{developers_csv}}
> **Playtime / Duration (HowLongToBeat)**:
> > **Main**: {{hltb_main}}
> > **Extra**: {{hltb_extra}}
> > **100%**: {{hltb_completionist}}

## Summary
{{description}}

## Notes & Personal Stats
**My Rating**: {{user_rating}}
**Status**: {{status}}
**Platform**: {{user_platform}}
**Date Started**: {{start_date}}
**Date Finished**: {{end_date}}
**Days To Beat**: {{days_to_beat}}
**Time Played**: {{user_playtime}}
**Version**: {{version}}

### Notes
{{user_notes}}

### Links
{{links_list}}

> [!cite] Review
> {{user_review}}

`;

export const DEFAULT_SETTINGS: GameMetadataPluginSettings = {
  rawgApiKey: "",
  steamApiKey: "",
  primaryProvider: "rawg",
  
  notesFolder: "Games",
  vnNotesFolder: "Games/Visual Novels",
  separateVnFolder: true,
  subfolderOrganization: "none",
  customSubfolderPattern: "{{status}}",
  fileNameFormat: "{{title}}",
  openNoteAfterCreation: true,

  fetchHltb: true,
  promptForUserStats: true,

  enableBanner: true,
  bannerProperty: "banner",
  bannerYOffset: 0.5,
  bannerSource: "background",

  frontmatterDateFormat: "YYYY-MM-DD",
  defaultPlayStatus: "Backlog",
  includeDataviewInlineFields: false,
  customFrontmatterKeys: DEFAULT_FRONTMATTER_KEYS,

  customNoteTemplate: "",
};
