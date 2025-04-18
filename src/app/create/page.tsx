"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function CreateGamePage() {
  const [concept, setConcept] = useState<string>("");
  const [minTurns, setMinTurns] = useState<number>(5);
  const [maxTurns, setMaxTurns] = useState<number>(15);
  const [displayName, setDisplayName] = useState<string>("");
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || "");
    }
  }, [user, displayName]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("Access Denied", {
        description: "You must be logged in to create a game.",
      });
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

  const createGameMutation = api.game.createGame.useMutation({
    onSuccess: (data) => {
      toast.success("Adventure Created!", {
        description: `Redirecting to game lobby: ${data.gameId}`,
      });
      console.log("Game creation successful, gameId:", data.gameId);
      router.push(`/game/${data.gameId}`);
    },
    onError: (error) => {
      console.error("Game creation failed:", error);
      toast.error("Failed to Create Adventure", {
        description:
          error.message ||
          "An unknown error occurred. Check console for details.",
      });
    },
  });

  const handleCreateGame = () => {
    if (!concept.trim()) {
      toast.error("Concept Missing", {
        description: "Please enter a concept for your adventure.",
      });
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display Name Missing", {
        description: "Please enter a display name.",
      });
      return;
    }
    if (minTurns > maxTurns) {
      toast.error("Invalid Turn Range", {
        description: "Minimum turns cannot be greater than maximum turns.",
      });
      return;
    }

    console.log("Attempting to create game with:", {
      concept,
      minTurns,
      maxTurns,
      displayName,
    });
    createGameMutation.mutate({ concept, minTurns, maxTurns, displayName });
  };

  const handleMinSliderChange = (value: number[]) => {
    const newMin = value[0];
    if (newMin !== undefined) {
      setMinTurns(newMin);
      if (newMin > maxTurns) {
        setMaxTurns(newMin);
      }
    }
  };

  const handleMaxSliderChange = (value: number[]) => {
    const newMax = value[0];
    if (newMax !== undefined) {
      setMaxTurns(newMax);
      if (newMax < minTurns) {
        setMinTurns(newMax);
      }
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New AI Adventure</CardTitle>
          <CardDescription>
            Define the concept, parameters, and your name for this adventure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="concept">Adventure Concept</Label>
            <Input
              id="concept"
              placeholder="e.g., A quest in a haunted forest"
              value={concept}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConcept(e.target.value)
              }
              disabled={createGameMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Your Display Name</Label>
            <Input
              id="displayName"
              placeholder="Adventurer"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              required
              disabled={createGameMutation.isPending}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="min-turns">Minimum Turns: {minTurns}</Label>
            </div>
            <Slider
              id="min-turns"
              min={3}
              max={20}
              step={1}
              value={[minTurns]}
              onValueChange={handleMinSliderChange}
              disabled={createGameMutation.isPending}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-turns">Maximum Turns: {maxTurns}</Label>
            </div>
            <Slider
              id="max-turns"
              min={3}
              max={30}
              step={1}
              value={[maxTurns]}
              onValueChange={handleMaxSliderChange}
              disabled={createGameMutation.isPending}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max turns must be greater than or equal to min turns.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleCreateGame}
            disabled={
              createGameMutation.isPending ||
              !concept.trim() ||
              !displayName.trim()
            }
          >
            {createGameMutation.isPending ? "Creating..." : "Create Adventure"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
