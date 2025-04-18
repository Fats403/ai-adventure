import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"; // Use protectedProcedure if auth is set up
import {
  CreateGameInputSchema,
  FindGameByJoinCodeInputSchema,
  JoinGameInputSchema,
  StartGameInputSchema,
} from "@/lib/zod/game";
import { generateInitialGameState } from "@/server/ai/openai";
import type { Game } from "@/types/game";
import { TRPCError } from "@trpc/server";
import { adminDb } from "@/server/db/firebase-admin"; // Import adminDb only
import { customAlphabet } from "nanoid"; // Use customAlphabet for specific chars/length

// Define nanoid generators
const nanoidGameId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  20,
); // Longer, unique ID for internal use
const nanoidJoinCode = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5); // 6-char code for users

async function saveGameToDatabase(game: Game): Promise<void> {
  console.log(`Saving game ID: ${game.id} to Firebase RTDB`);
  const gameRef = adminDb.ref(`games/${game.id}`);
  try {
    await gameRef.set(game);
    console.log(`Game ${game.id} saved successfully.`);
  } catch (error) {
    console.error(`Failed to save game ${game.id} to Firebase:`, error);
    // Throw a specific error that can be caught by the mutation
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save game data to the database.",
      cause: error,
    });
  }
}

export const gameRouter = createTRPCRouter({
  createGame: protectedProcedure
    .input(CreateGameInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { concept, minTurns, maxTurns, displayName } = input;
      const userId = ctx.user.uid;

      console.log(`Creating game for user: ${userId}, name: ${displayName}`);

      try {
        const initialState = await generateInitialGameState(concept);
        const gameId = nanoidGameId();
        const joinCode = nanoidJoinCode();
        const now = Date.now();

        const newGame: Game = {
          id: gameId,
          metadata: {
            concept,
            creator: userId,
            minTurns,
            maxTurns,
            createdAt: now,
            joinCode,
          },
          status: "waiting",
          players: {
            [userId]: {
              name: displayName,
              health: 100,
              gold: 0,
            },
          },
          gameState: {
            currentTurn: 1,
            totalTurns: maxTurns,
            currentScenario: initialState.scenario,
            currentImage: initialState.imageDescription,
            currentOptions: initialState.options,
            activePlayer: userId,
          },
          history: [],
        };

        await saveGameToDatabase(newGame);
        return { gameId: newGame.id };
      } catch (error) {
        console.error("Error in createGame mutation:", error);
        if (error instanceof TRPCError) throw error;

        // Handle AI-specific errors
        if (
          error instanceof Error &&
          (error.message.startsWith("AI response") ||
            error.message.startsWith("OpenAI API"))
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `AI interaction failed: ${error.message}`,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create game.",
          cause: error,
        });
      }
    }),

  findGameByJoinCode: protectedProcedure
    .input(FindGameByJoinCodeInputSchema)
    .query(async ({ input }) => {
      const { joinCode } = input;
      console.log(`Searching for game with join code: ${joinCode}`);

      try {
        // Query for the game with this join code
        const snapshot = await adminDb
          .ref("games")
          .orderByChild("metadata/joinCode")
          .equalTo(joinCode)
          .get();

        if (!snapshot.exists()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid join code.",
          });
        }

        // Get the data and extract the first matching game
        const gamesData = snapshot.val();
        const gameIds = Object.keys(gamesData);

        // Validate we have exactly one game
        if (gameIds.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No game found with the provided join code.",
          });
        }
        if (gameIds.length > 1) {
          console.warn(
            `Multiple games (${gameIds.length}) found with join code ${joinCode}`,
          );
        }

        // Extract the first game found (even if multiple, use the first one)
        const gameId = gameIds[0]!;
        const game = gamesData[gameId] as Game;

        if (!game) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error retrieving game details.",
          });
        }

        if (game.status !== "waiting") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This game is already in progress or has ended.",
          });
        }

        // Get creator's display name for the UI
        const creatorName =
          game.players?.[game.metadata.creator]?.name ?? "Unknown Creator";

        return {
          gameId,
          concept: game.metadata.concept,
          creatorName,
        };
      } catch (error) {
        console.error(`Error finding game by join code ${joinCode}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to look up join code.",
          cause: error,
        });
      }
    }),

  joinGame: protectedProcedure
    .input(JoinGameInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { gameId, displayName } = input;
      const userId = ctx.user.uid;
      const now = Date.now();

      console.log(`User ${userId} joining game ${gameId} as "${displayName}"`);

      try {
        // Verify the game exists and is in waiting status
        const snapshot = await adminDb.ref(`games/${gameId}`).get();

        if (!snapshot.exists()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }

        const game = snapshot.val() as Game;

        if (game.status !== "waiting") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This game has already started or has ended.",
          });
        }

        // Check if the player is already in the game
        if (game.players && game.players[userId]) {
          console.log(
            `User ${userId} already in game ${gameId}, updating presence.`,
          );

          // Just update their online status
          await adminDb.ref(`games/${gameId}/players/${userId}`).update({
            online: true,
            lastSeen: now,
          });

          return {
            success: true,
            message: "Already joined. Presence updated.",
          };
        }

        // Add the new player
        await adminDb.ref(`games/${gameId}/players/${userId}`).set({
          name: displayName,
          health: 100,
          gold: 0,
          online: true,
          lastSeen: now,
        });

        console.log(`User ${userId} successfully joined game ${gameId}`);
        return { success: true, message: "Successfully joined the game." };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error(`Error joining game ${gameId}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join game.",
          cause: error,
        });
      }
    }),

  startGame: protectedProcedure
    .input(StartGameInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { gameId } = input;
      const userId = ctx.user.uid;

      console.log(`User ${userId} attempting to start game ${gameId}`);

      const gameRef = adminDb.ref(`games/${gameId}`);

      try {
        const snapshot = await gameRef.get();
        if (!snapshot.exists()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }

        const game = snapshot.val() as Game;
        // TODO: Add validation for the game object

        // 1. Check Status
        if (game.status !== "waiting") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Game cannot be started (status: ${game.status}).`,
          });
        }

        // 2. Check if user is the creator
        if (game.metadata.creator !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the creator can start the game.",
          });
        }
        // 3. Update game status to 'active'
        // We only need to update the status field
        await gameRef.child("status").set("active");

        // Optionally, you could update the whole game object if other fields change at start
        // await gameRef.update({ status: 'active', /* other start-game updates */ });

        console.log(
          `Game ${gameId} successfully started by creator ${userId}.`,
        );
        return { success: true, message: "Game started successfully!" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error(
          `Error starting game ${gameId} by user ${userId}:`,
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start game.",
          cause: error,
        });
      }
    }),
});
