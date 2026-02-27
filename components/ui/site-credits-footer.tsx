import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 4 22 20H2z" />
    </svg>
  );
}

function SupabaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12.9 2.5c.53-.73 1.69-.36 1.69.55v8.24l5.74 8.7c.46.69-.03 1.62-.87 1.62h-3.37c-.5 0-.97-.25-1.24-.67l-5.94-9.01c-.35-.53-.34-1.21.02-1.73z"
        fill="#3ECF8E"
      />
      <path
        d="M11.1 21.5c-.53.73-1.69.36-1.69-.55v-8.24l-5.74-8.7c-.46-.69.03-1.62.87-1.62h3.37c.5 0 .97.25 1.24.67l5.94 9.01c.35.53.34 1.21-.02 1.73z"
        fill="#1F9E68"
      />
    </svg>
  );
}

function BrandBadge({
  label,
  href,
  icon,
  name,
  iconClassName
}: {
  label: string;
  href: string;
  icon: ReactNode;
  name: string;
  iconClassName: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${label} ${name}`}
    >
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-0.5">
        <span className={iconClassName}>{icon}</span>
        <span className="font-semibold">{name}</span>
      </span>
    </a>
  );
}

export function SiteCreditsFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("w-full", className)}>
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/45 p-3 shadow-sm backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-18%,hsl(var(--primary)/0.16),transparent_42%),radial-gradient(circle_at_88%_118%,hsl(var(--primary)/0.12),transparent_38%)]"
        />
        <div className="relative flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <BrandBadge
              label="Deploy in"
              href="https://vercel.com"
              icon={<VercelLogo className="h-3.5 w-3.5" />}
              name="Vercel"
              iconClassName="text-foreground dark:text-white"
            />
            <BrandBadge
              label="Powered by"
              href="https://supabase.com"
              icon={<SupabaseLogo className="h-3.5 w-3.5" />}
              name="Supabase"
              iconClassName=""
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">&copy; 2026. Julião Martins.</p>
        </div>
      </div>
    </footer>
  );
}
