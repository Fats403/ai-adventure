"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { api } from "@/trpc/react"; // Import tRPC hook
import { Separator } from "@/components/ui/separator"; // Import Separator
import { cn } from "@/lib/utils"; // Import cn helper for conditional classes
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [gameData, setGameData] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false); // Turn processing state

  // TODO: Get current user ID from auth state
  const { user, isLoading: isAuthLoading } = useAuth(); // Replace with actual user ID from auth context

  // --- Authentication Check ---
  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("Authentication Required", {
        description: "Please log in to view a game.",
      });
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

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
          console.log(
            "Received game data update:",
            data.status,
            "Turn:",
            data.gameState?.currentTurn,
          );
          setGameData(data as Game);
          setError(null);
        } else {
          console.log(
            `Game data for ${gameId} does not exist or user lacks permission.`,
          );
          setError(
            `Game not found (ID: ${gameId}) or access denied. It might have been deleted or the ID is incorrect.`,
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
  }, [gameId, user, isAuthLoading]); // Re-run effect if gameId changes

  const isCreator = gameData?.metadata?.creator === user?.uid;

  // --- tRPC Mutation for Starting Game ---
  const startGameMutation = api.game.startGame.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Game started!");
      // No need to manually update state, Firebase listener will catch the status change
    },
    onError: (error) => {
      console.error("Start game failed:", error);
      toast.error("Failed to Start Game", { description: error.message });
    },
  });

  const handleStartGame = () => {
    if (!gameId) return;
    console.log("Attempting to start game:", gameId);
    startGameMutation.mutate({ gameId }); // Call the mutation
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (!gameData || !user) return;
    const selectedOption = gameData.gameState.currentOptions[optionIndex];
    console.log(
      `Player ${user.uid} selected option ${optionIndex + 1}: "${selectedOption}"`,
    );
    toast.info(`You chose: "${selectedOption}"`, {
      description: "Waiting for AI response...",
    });
    setIsProcessingTurn(true);
    // TODO: Implement processTurn tRPC mutation
    setTimeout(() => {
      console.log("Simulated AI processing finished.");
      // setIsProcessingTurn(false); // This would be set in the mutation's onSettled/onSuccess
    }, 2000);
  };

  if (isAuthLoading || isLoading) {
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

  // Determine roles and current player info
  const isMyTurn = user?.uid === gameData.gameState.activePlayer;
  const activePlayer = gameData.players[gameData.gameState.activePlayer];
  const activePlayerName = activePlayer?.name ?? "Unknown Player";

  // --- Active Game View ---
  if (gameData.status === "active") {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col p-4 md:p-6 lg:p-8">
        {/* Top Bar */}
        <div className="mb-4 text-center text-xl font-bold tracking-tight">
          Turn {gameData.gameState.currentTurn} / {gameData.metadata.maxTurns} -{" "}
          {activePlayerName}&apos;s Turn
          {isMyTurn ? (
            <Badge variant="default" className="ml-3 bg-green-600 align-middle">
              Your Turn
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-3 align-middle">
              Waiting
            </Badge>
          )}
        </div>
        {/* Main Content Area - Remove overflow-hidden */}
        <div className="mb-4 grid flex-grow grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* Image Area - Added responsive min-height */}
          {/* Sets a minimum height on mobile, allows it to be taller on md+ */}
          <Card className="border-border/50 flex min-h-[250px] flex-col overflow-hidden border-2 border-dashed p-0 md:min-h-0">
            <CardContent className="relative flex-grow p-0">
              {gameData.gameState.currentImage ? (
                <Image
                  src={gameData.gameState.currentImage}
                  alt={
                    gameData.gameState.currentImageDescription ||
                    "Current game scene"
                  }
                  fill
                  className="object-cover"
                  priority={true}
                  unoptimized
                />
              ) : (
                <div className="bg-muted/40 flex h-full items-center justify-center p-6 text-center">
                  <span className="text-muted-foreground text-lg italic">
                    {gameData.gameState.currentImageDescription ||
                      "Image generation pending or failed..."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scenario Text Area - Remove h-full */}
          <Card className="flex flex-col gap-0 border shadow-sm">
            <CardHeader className="gap-0">
              <CardTitle>Current Situation</CardTitle>
            </CardHeader>
            {/* Remove overflow-y-auto, add padding if needed directly or let ScrollArea handle it */}
            <CardContent className="prose dark:prose-invert min-h-[150px] max-w-none flex-grow p-0">
              <ScrollArea className="h-full w-full p-6">
                <p>{gameData.gameState.currentScenario}</p>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        {/* Options Card (no height changes needed) */}
        <Card className="mb-4 border shadow-sm">
          <CardHeader>
            <CardTitle>Choose Your Action</CardTitle>
            {!isMyTurn && (
              <CardDescription>
                Waiting for {activePlayerName}...
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {gameData.gameState.currentOptions.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "h-auto min-h-[60px] justify-start p-4 text-left whitespace-normal transition-colors duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  !isMyTurn || isProcessingTurn
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer",
                )}
                disabled={!isMyTurn || isProcessingTurn}
                onClick={() => handleOptionSelect(index)}
              >
                <span className="mr-2 font-bold">{index + 1}.</span> {option}
              </Button>
            ))}
          </CardContent>
        </Card>
        {/* Player Status Card (no height changes needed) */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Adventurers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {Object.entries(gameData.players).map(([id, player], index) => (
                <li key={id}>
                  <div
                    className={cn(
                      "flex flex-col items-start justify-between gap-2 rounded-md p-2 sm:flex-row sm:items-center",
                      id === gameData.gameState.activePlayer && "bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          id === gameData.gameState.activePlayer &&
                            "text-primary",
                        )}
                      >
                        {player.name}
                      </span>
                      {id === gameData.metadata.creator && (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          Creator
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="secondary">HP: {player.health}</Badge>
                      <Badge variant="secondary">Gold: {player.gold}</Badge>
                    </div>
                  </div>
                  {index < Object.keys(gameData.players).length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Lobby View (status === 'waiting') ---
  if (gameData.status === "waiting") {
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

            {gameData.status === "waiting" ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                Waiting for the creator to start the game...
              </p>
            ) : gameData.status === "active" ? (
              <p className="text-center font-semibold text-green-600 dark:text-green-400">
                Game in progress!
              </p>
            ) : (
              <p className="text-center font-semibold text-blue-600 dark:text-blue-400">
                Game completed.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Show start button only to creator when game is waiting */}
        {canStartGame && (
          <Button
            onClick={handleStartGame}
            disabled={startGameMutation.isPending}
            size="lg"
          >
            {startGameMutation.isPending ? "Starting..." : "Start Game"}
          </Button>
        )}
      </div>
    );
  }

  // --- Completed/Other Status View ---
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Game Status: {gameData.status}</CardTitle>
          <CardDescription>
            Concept: {gameData.metadata.concept}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This game has concluded or is in an unexpected state.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/")}>Back to Home</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
