import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, Settings, UtensilsCrossed, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center -ml-1"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-2xl">
              <DropdownMenuItem asChild>
                <Link
                  to="/"
                  data-active={location.pathname === "/" ? "true" : undefined}
                  className="flex items-center gap-2 cursor-pointer data-[active=true]:bg-secondary"
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/meals"
                  data-active={
                    location.pathname === "/meals" ? "true" : undefined
                  }
                  className="flex items-center gap-2 cursor-pointer data-[active=true]:bg-secondary"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Meal menu
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  data-active={
                    location.pathname === "/settings" ? "true" : undefined
                  }
                  className="flex items-center gap-2 cursor-pointer data-[active=true]:bg-secondary"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-xl">🌿</span>
            <span className="font-serif text-xl font-semibold tracking-tight">
              Hearth
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
