import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Photo Salon</h1>
        <p className="text-muted-foreground mb-8">Monthly photography competitions for your club</p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
