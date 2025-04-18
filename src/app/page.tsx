"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { signInWithGoogle } from "@/lib/firebase/auth";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    toast.info("Attempting Google Sign-In...");
    try {
      await signInWithGoogle();
      toast.success("Sign-In Successful!");
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      let errorMessage = "An unknown error occurred during Google Sign-In.";
      if (error instanceof Error && "code" in error) {
        switch ((error as { code: string }).code) {
          case "auth/popup-closed-by-user":
            errorMessage = "Sign-in popup closed before completion.";
            toast.dismiss();
            break;
          case "auth/cancelled-popup-request":
            errorMessage =
              "Multiple sign-in attempts detected. Please try again.";
            break;
          default:
            errorMessage = (error as Error).message;
        }
        if ((error as { code: string }).code !== "auth/popup-closed-by-user") {
          toast.error("Google Sign-In Failed", { description: errorMessage });
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        toast.error("Google Sign-In Failed", { description: errorMessage });
      } else {
        toast.error("Google Sign-In Failed", { description: errorMessage });
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error("Please enter a join code.");
      return;
    }
    if (trimmedCode.length !== 5) {
      toast.error("Invalid join code format.", {
        description: "Join codes are 5 characters long.",
      });
      return;
    }
    setIsJoining(true);
    console.log("Attempting to join game with code:", trimmedCode);
    router.push(`/join/${trimmedCode}`);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              Welcome back, {user.displayName || "Adventurer"}!
            </CardTitle>
            <CardDescription>Ready for a new story?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button className="w-full" size="lg" asChild>
              <Link href="/create">Create New Adventure</Link>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or Join Existing
                </span>
              </div>
            </div>

            <form onSubmit={handleJoinGame} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-code">Enter Join Code</Label>
                <Input
                  id="join-code"
                  placeholder="ABCDE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={5}
                  className="text-center tracking-widest uppercase"
                  disabled={isJoining}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={isJoining || !joinCode.trim()}
              >
                {isJoining ? "Joining..." : "Join Adventure"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center"></CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to AI Adventure
          </CardTitle>
          <CardDescription>
            Sign in with Google to begin your journey.
          </CardDescription>
        </CardHeader>
        <CardContent></CardContent>
        <CardFooter className="flex justify-center">
          <Button
            className="w-full max-w-xs"
            onClick={handleGoogleLogin}
            disabled={isLoadingGoogle}
            variant="outline"
          >
            {isLoadingGoogle ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Image
                src="/google-icon.png"
                alt="Google Icon"
                className="mr-2 h-4 w-4"
                width={16}
                height={16}
              />
            )}
            {isLoadingGoogle ? "Signing In..." : "Sign In with Google"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
