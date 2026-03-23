import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "@/lib/api-client";
import { signIn } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async ({ context }) => {
    const currentUser = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (currentUser) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/auth/callback`,
      });
      if (result.error) {
        setError(result.error.message || "Failed to send sign in link");
        return;
      }
      setIsSubmitted(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <AuthPanel>
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-1">
            We sent a sign in link to <strong className="text-foreground">{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel>
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your email to sign in</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Sending link..." : "Send sign in link"}
        </button>
      </form>
    </AuthPanel>
  );
}

function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">Photo Salon</span>
        </div>
        <div className="rounded-2xl border border-border p-8">{children}</div>
      </div>
    </div>
  );
}
