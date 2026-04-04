import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { organization } from "@/lib/auth-client";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context }) => {
    const currentUser = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (!currentUser) {
      throw redirect({ to: "/login" });
    }
    const config = await context.queryClient.fetchQuery(orpc.onboarding.config.queryOptions());
    if (config.hasOrganization) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { data: config } = useSuspenseQuery(orpc.onboarding.config.queryOptions());
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const navigate = useNavigate();

  const checkout = useMutation({
    ...orpc.onboarding.createCheckout.mutationOptions(),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create checkout."),
  });

  const freeOrg = useMutation({
    ...orpc.onboarding.createFreeOrg.mutationOptions(),
    onSuccess: async (data) => {
      await organization.setActive({ organizationId: data.organizationId });
      toast.success("Club created!");
      navigate({ to: "/dashboard" });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create club."),
  });

  const form = useForm({
    defaultValues: { clubName: "" },
    onSubmit: async ({ value }) => {
      if (config.polarEnabled) {
        await checkout.mutateAsync({ clubName: value.clubName, plan });
      } else {
        await freeOrg.mutateAsync({ clubName: value.clubName });
      }
    },
  });

  const isPending = checkout.isPending || freeOrg.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">Photo Salon</span>
          <p className="mt-2 text-muted-foreground">Create your photography club</p>
        </div>

        <div className="rounded-2xl border border-border p-8">
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
            className="space-y-6"
          >
            <form.Field name="clubName">
              {(field) => (
                <div>
                  <label className="mb-1 block text-sm font-medium">Club name</label>
                  <input
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="e.g. Portland Camera Club"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              )}
            </form.Field>

            {config.polarEnabled && (
              <div>
                <label className="mb-3 block text-sm font-medium">Choose a plan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlan("monthly")}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      plan === "monthly"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="text-sm font-medium">Monthly</div>
                    <div className="mt-1 text-2xl font-bold">
                      ${config.monthlyPrice / 100}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan("yearly")}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      plan === "yearly"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Yearly</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        2 months free
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      ${config.yearlyPrice / 100}
                      <span className="text-sm font-normal text-muted-foreground">/yr</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending
                ? "Creating…"
                : config.polarEnabled
                  ? "Continue to payment"
                  : "Create club"}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-center text-sm text-muted-foreground">
              Been invited to a club?{" "}
              <span className="text-foreground">
                Check your email for a welcome link from your club admin.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
