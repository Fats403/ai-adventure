type PlayerId = string;
type UserId = string;

interface GameMetadata {
  title?: string; // Title might be generated later or same as concept initially
  concept: string;
  creator: UserId;
  minTurns: number;
  maxTurns: number;
  createdAt: number; // Use timestamp number (e.g., Date.now())
  joinCode: string; // Added field for the 6-character join code
}

interface Player {
  name: string;
  health: number;
  gold: number;
}

interface TurnHistory {
  turn: number;
  player: PlayerId;
  scenario: string;
  options: [string, string, string, string];
  selectedOption: number; // Index 0-3
  outcome: string;
  imageUrl?: string | null;
}

interface CurrentGameState {
  currentTurn: number;
  totalTurns: number; // This seems redundant if we have maxTurns, maybe remove? Or rename maxTurns to totalTurns in metadata? Let's keep for now.
  currentScenario: string;
  currentImage: string | null; // Will store the generated image URL, null initially or if failed
  currentImageDescription: string; // Store the prompt used for the current image
  currentOptions: [string, string, string, string];
  activePlayer: PlayerId;
}

export interface Game {
  id: string; // Add an ID for the game
  metadata: GameMetadata;
  status: "waiting" | "active" | "completed";
  players: Record<PlayerId, Player>;
  gameState: CurrentGameState;
  history: TurnHistory[];
}
