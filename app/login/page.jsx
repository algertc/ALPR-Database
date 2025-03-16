"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.target);

    startTransition(async () => {
      try {
        const result = await loginAction(formData);
        if (result.error) {
          setError(result.error);
        } else if (result.success) {
          router.push("/dashboard");
        }
      } catch (e) {
        setError("An error occurred during login");
        console.error("Login error:", e);
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/95">
      <img
        src="/grid.svg"
        className="absolute bottom-0 w-full -z-10 invert"
        alt="Background grid"
      />

      <div className="w-full max-w-md px-8 z-10">
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            ALPR Database
          </h1>
          <p className="text-muted-foreground">
            Enter your password to continue
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your password"
                  className="h-12 px-4 bg-background/50"
                />
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
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

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Administrator Login</p>
        </div>
      </div>
    </div>
  );
}
