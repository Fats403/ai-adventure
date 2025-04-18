"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clientDb } from "@/lib/firebase/client"; // Import Firebase client DB
import { ref, onValue, off } from "firebase/database"; // Import RTDB functions
import type { Game } from "@/types/game"; // Import the Game type
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Badge } from "@/components/ui/badge"; // To display join code nicely
import { useAuth } from "@/components/providers/auth-provider";

// TODO: Add authentication check - users should likely be logged in to view/join

export default function GameLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [gameData, setGameData] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get current user ID from auth state
  const { user } = useAuth(); // Replace with actual user ID from auth context

  useEffect(() => {
    if (!gameId) {
      setError("No game ID provided.");
      setIsLoading(false);
      return;
    }

    console.log(`Setting up listener for game: /games/${gameId}`);
    const gameRef = ref(clientDb, `games/${gameId}`);

    // Listener callback
    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        const data = snapshot.val();
        if (snapshot.exists() && data) {
          console.log("Received game data update:", data);
          setGameData(data as Game);
          setError(null);
        } else {
          console.log(`Game data for ${gameId} does not exist.`);
          setError(
            `Game not found (ID: ${gameId}). It might have been deleted or the ID is incorrect.`,
          );
          setGameData(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase read error:", error);
        setError(`Failed to load game data: ${error.message}`);
        setIsLoading(false);
      },
    );

    // Cleanup function to detach the listener when the component unmounts or gameId changes
    return () => {
      console.log(`Detaching listener for game: /games/${gameId}`);
      off(gameRef, "value", unsubscribe); // Detach the specific listener callback
    };
  }, [gameId]); // Re-run effect if gameId changes

  const isCreator = gameData?.metadata?.creator === user?.uid;

  const handleStartGame = () => {
    // TODO: Implement start game logic (likely a tRPC mutation)
    // This mutation would change game.status to 'active'
    console.log("Start game button clicked - not implemented yet");
    alert("Starting the game is not yet implemented.");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="mb-2 h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3 self-center" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        Game not found or access denied.
      </div>
    );
  }

  // Determine if the game can be started (basic condition: creator is present and status is waiting)
  const canStartGame = isCreator && gameData.status === "waiting"; // Add more conditions? (e.g., min players)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="mb-6 w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Adventure Lobby: {gameData.metadata.concept}</CardTitle>
          <CardDescription>Game ID: {gameId}</CardDescription>
          <div className="pt-2">
            <span className="mr-2 text-sm font-medium">Join Code:</span>
            <Badge
              variant="secondary"
              className="cursor-pointer font-mono text-lg tracking-widest"
              title="Click to copy (not implemented)"
            >
              {gameData.metadata.joinCode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="mb-3 text-lg font-semibold">
            Players ({Object.keys(gameData.players ?? {}).length}):
          </h3>
          <ul className="mb-6 list-inside list-disc space-y-1">
            {gameData.players &&
              Object.entries(gameData.players).map(([id, player]) => (
                <li key={id} className="flex items-center justify-between">
                  <span>
                    {player.name}
                    {id === gameData.metadata.creator && (
                      <Badge variant="outline" className="ml-2">
                        Creator
                      </Badge>
                    )}
                  </span>
                </li>
              ))}
            {!gameData.players && <li>No players yet.</li>}
          </ul>

          {gameData.status === "waiting" && (
            <p className="text-center text-gray-600 dark:text-gray-400">
              Waiting for the creator to start the game...
            </p>
          )}
          {gameData.status === "active" && (
            <p className="text-center font-semibold text-green-600 dark:text-green-400">
              Game in progress!
            </p>
          )}
          {gameData.status === "completed" && (
            <p className="text-center font-semibold text-blue-600 dark:text-blue-400">
              Game completed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Show start button only to creator when game is waiting */}
      {canStartGame && (
        <Button onClick={handleStartGame} size="lg">
          Start Game
        </Button>
      )}

      {/* TODO: Add Join Game button/logic for non-creators if not automatically added on visit */}
      {/* TODO: Add mechanism for users to enter join code if navigating directly */}
    </div>
  );
}
