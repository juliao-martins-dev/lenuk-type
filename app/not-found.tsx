import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main
      aria-labelledby="not-found-title"
      className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.16),transparent_38%),radial-gradient(circle_at_85%_10%,hsl(var(--primary)/0.12),transparent_34%)]"
      />

      <section className="w-full max-w-2xl rounded-3xl border border-border/80 bg-card/80 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl md:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          <SearchX className="h-3.5 w-3.5 text-primary" />
          404 • Page not found
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Image
              src="/icon.png"
              alt="Lenuk Type logo"
              width={28}
              height={28}
              priority
              className="h-7 w-7 rounded-md object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Lenuk Type</p>
            <p className="text-xs text-muted-foreground">Typing test | English + Tetun</p>
          </div>
        </div>

        <h1 id="not-found-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          The page you are looking for does not exist or the link is incorrect. Go back to the home page to start
          typing.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/90 md:text-sm">
          Pajina ne&apos;e la iha. Fila ba uma atu komesa teste tipu.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
