import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*", "esbuild.config.*"],
        },
      },
    },
    rules: {
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["RAWG", "Steam", "VNDB", "HowLongToBeat", "HLTB", "Obsidian", "Markdown", "Dataview"],
          acronyms: ["API", "ID", "URL", "BBCode", "UI", "CSV", "PC"],
          enforceCamelCaseLower: false,
        },
      ],
    },
  },
  {
    ignores: [
      "main.js",
      "node_modules/**",
      "dist/**",
      "*.d.ts"
    ],
  },
]);
