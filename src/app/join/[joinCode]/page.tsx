"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Extract and validate joinCode
  const rawJoinCode = params.joinCode as string;
  const joinCode = rawJoinCode?.toUpperCase(); // Ensure uppercase for query

  const [displayName, setDisplayName] = useState<string>("");

  // --- Redirect if not authenticated ---
  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("Authentication Required", {
        description: "Please log in to join a game.",
      });
      router.replace("/"); // Redirect to login
    }
  }, [user, isAuthLoading, router]);

  // --- Pre-fill display name ---
  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || "");
    }
  }, [user, displayName]);

  // --- tRPC Query: Find game by join code ---
  const {
    data: gameInfo,
    isLoading: isLoadingGameInfo,
    error: gameInfoError,
  } = api.game.findGameByJoinCode.useQuery(
    { joinCode: joinCode },
    {
      enabled: !!joinCode && !!user, // Only run query if code exists and user is loaded
      staleTime: Infinity, // Data unlikely to change for this confirmation step
      retry: false, // Don't retry if code is invalid
      refetchOnWindowFocus: false,
    },
  );

  // --- tRPC Mutation: Join game ---
  const joinGameMutation = api.game.joinGame.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Successfully joined!", {
        description: "Redirecting to lobby...",
      });
      if (gameInfo?.gameId) {
        router.push(`/game/${gameInfo.gameId}`);
      } else {
        // Fallback if gameId somehow isn't available (shouldn't happen)
        toast.error("Could not determine game ID for redirect.");
        router.push("/");
      }
    },
    onError: (error) => {
      console.error("Join game failed:", error);
      toast.error("Failed to Join Game", { description: error.message });
    },
  });

  // --- Handle Join Button Click ---
  const handleConfirmJoin = () => {
    if (!gameInfo?.gameId) {
      toast.error("Cannot join: Game information is missing.");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display Name Required", {
        description: "Please enter how you want to appear in the game.",
      });
      return;
    }

    joinGameMutation.mutate({
      gameId: gameInfo.gameId,
      displayName: displayName.trim(),
    });
  };

  // --- Render Logic ---

  // Loading auth state
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }
  // Auth required but user is null (should be handled by redirect effect, but belt-and-suspenders)
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Show loading skeleton while fetching game info
  const renderLoadingState = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-1/4" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  // Show error message if fetching game info failed
  const renderErrorState = () => (
    <Card className="border-destructive w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-destructive">Error</CardTitle>
        <CardDescription>
          Could not find game with code: {joinCode}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-destructive text-sm">
          {gameInfoError?.message || "An unknown error occurred."}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Please check the code and try again.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      {isLoadingGameInfo && renderLoadingState()}
      {gameInfoError && renderErrorState()}
      {!isLoadingGameInfo && !gameInfoError && gameInfo && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Adventure</CardTitle>
            <CardDescription>
              You are about to join the adventure:{" "}
              <span className="font-semibold">{gameInfo.concept}</span>
            </CardDescription>
            <CardDescription>
              Created by:{" "}
              <span className="font-semibold">{gameInfo.creatorName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Display Name</Label>
              <Input
                id="displayName"
                placeholder="Adventurer Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                required
                disabled={joinGameMutation.isPending}
              />
              <p className="text-muted-foreground text-xs">
                This is how you'll appear in the game.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleConfirmJoin}
              disabled={joinGameMutation.isPending || !displayName.trim()}
            >
              {joinGameMutation.isPending
                ? "Joining..."
                : "Confirm & Join Game"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
