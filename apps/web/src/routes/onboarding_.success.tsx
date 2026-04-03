import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { orpc } from "@/lib/api-client";
import { organization } from "@/lib/auth-client";

export const Route = createFileRoute("/onboarding_/success")({
  beforeLoad: async ({ context }) => {
    const currentUser = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (!currentUser) {
      throw redirect({ to: "/login" });
    }
  },
  component: OnboardingSuccessPage,
});

function OnboardingSuccessPage() {
  const queryClient = useQueryClient();

  // Poll onboarding config until org exists (webhook may take a moment)
  const { data: config } = useQuery({
    ...orpc.onboarding.config.queryOptions(),
    refetchInterval: (query) => {
      return query.state.data?.hasOrganization ? false : 2000;
    },
  });

  useEffect(() => {
    if (!config?.hasOrganization) return;

    async function activate() {
      // Get the org list and set the first one active
      const res = await organization.list();
      const orgs = res.data;
      if (orgs && orgs.length > 0) {
        await organization.setActive({ organizationId: orgs[0].id });
      }

      // Invalidate the currentUser cache so the dashboard picks up the new activeOrganization
      await queryClient.invalidateQueries({ queryKey: orpc.currentUser.me.queryOptions().queryKey });

      // Hard navigate to flush all SSR/cache state
      window.location.assign("/dashboard");
    }
    activate();
  }, [config?.hasOrganization, queryClient]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center">
        <span className="text-2xl font-bold">Photo Salon</span>
        <p className="mt-4 text-muted-foreground">
          Setting up your club...
        </p>
        <div className="mt-4 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-primary" />
        </div>
      </div>
    </div>
  );
}
