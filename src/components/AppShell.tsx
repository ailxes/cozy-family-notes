import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, Settings } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isCalendar = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-xl">🌿</span>
            <span className="font-serif text-xl font-semibold tracking-tight">
              Hearth
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isCalendar
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week
            </Link>
            <Link
              to="/settings"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !isCalendar
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/60">
        <div className="grid grid-cols-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isCalendar ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Calendar className="w-5 h-5" />
            Week
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              !isCalendar ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </nav>
    </div>
  );
}
