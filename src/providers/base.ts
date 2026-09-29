import { GameMetadata } from "../models/game";

export interface GameDataProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Search for games matching the given query string.
   */
  search(query: string): Promise<GameMetadata[]>;

  /**
   * Get comprehensive metadata for a specific game.
   */
  getDetails(id: string | number): Promise<GameMetadata>;
}
