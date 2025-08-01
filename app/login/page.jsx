// app/login/page.js
"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(""); // Clear previous errors

    const formData = new FormData(event.target);

    startTransition(async () => {
      try {
        const result = await loginAction(formData);

        if (result && result.error) {
          setError(result.error);
        }
      } catch (e) {
        setError(
          "An unexpected error occurred during login. Please try again."
        );
        console.error("Login client-side error:", e);
      }
    });
  }

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/95 overflow-hidden">
      <Image
        src="/grid.svg"
        className="absolute bottom-0 w-full -z-10 invert"
        alt="Background grid"
        width={1920}
        height={1080}
        priority
      />

      <div className="w-full max-w-md px-6 sm:px-8 z-10">
        <div className="mb-6 sm:mb-10 text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            ALPR Database
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your password to continue
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 sm:space-y-6"
              autoComplete="on"
            >
              {/* HIDDEN FIELD FOR AUTOFULL HEURISTICS */}
              <Input
                id="username_hidden" // Unique ID
                name="username_hidden" // Unique name
                type="text"
                autoComplete="username" // Crucial for username autofill context
                style={{ display: "none", opacity: 0, height: 0, width: 0 }} // Visually hide it completely
                aria-hidden="true" // Hide from screen readers
                tabIndex="-1" // Make it non-focusable
              />

              <div className="space-y-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Enter your password"
                  className="h-10 sm:h-12 px-4 bg-background/50"
                />
              </div>

              {error && (
                <div className="p-3 sm:p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 sm:h-12 text-base font-medium"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Administrator Login</p>
        </div>
      </div>
    </div>
  );
}
