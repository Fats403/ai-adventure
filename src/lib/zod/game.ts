import { z } from "zod";

// Schema for the AI's response when initializing a game
export const InitialGameStateSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  scenario: z.string().min(1, "Scenario cannot be empty."),
  imagePrompt: z.string().min(1, "Image prompt cannot be empty."),
  options: z
    .tuple([
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
    ])
    .refine((options) => new Set(options).size === options.length, {
      message: "Options must be unique.",
    }),
});

export type InitialGameState = z.infer<typeof InitialGameStateSchema>;

// Schema for the input to the createGame mutation
export const CreateGameInputSchema = z
  .object({
    concept: z
      .string()
      .min(5, "Concept must be at least 5 characters long.")
      .max(200, "Concept is too long."),
    minTurns: z.number().int().min(3).max(20),
    maxTurns: z.number().int().min(3).max(30),
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters.")
      .max(30, "Display name is too long."),
  })
  .refine((data) => data.minTurns <= data.maxTurns, {
    message: "Minimum turns cannot be greater than maximum turns.",
    path: ["minTurns"], // Optionally associate the error with a specific field
  });

export type CreateGameInput = z.infer<typeof CreateGameInputSchema>;

// Schema for finding game by join code
export const FindGameByJoinCodeInputSchema = z.object({
  joinCode: z
    .string()
    .length(5, "Join code must be 5 characters long.")
    .regex(/^[A-Z0-9]+$/, "Invalid join code format."),
});

export type FindGameByJoinCodeInput = z.infer<
  typeof FindGameByJoinCodeInputSchema
>;

// Schema for joining a game
export const JoinGameInputSchema = z.object({
  gameId: z.string().min(10), // Basic length check
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(30, "Display name is too long."),
});

export type JoinGameInput = z.infer<typeof JoinGameInputSchema>;

// Schema for starting a game
export const StartGameInputSchema = z.object({
  gameId: z.string().min(10), // Basic length check
});

export type StartGameInput = z.infer<typeof StartGameInputSchema>;
