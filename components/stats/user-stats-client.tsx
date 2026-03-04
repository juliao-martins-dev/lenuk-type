"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Download,
  Flame,
  Home,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { clearUserStats, readUserStats, type StoredRun, type UserStats } from "@/lib/user-stats";
import { SiteCreditsFooter } from "../ui/site-credits-footer";
import {
  DAY_LABELS,
  RANGE_OPTIONS,
  buildStatsView,
  formatDate,
  formatDuration,
  formatJoinedDate,
  formatRelativeTime,
  formatShortDate,
  getStoredProfile,
  heatmapCellClass,
  type RangeId
} from "./stats-dashboard";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

export default function UserStatsClient() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState(() => getStoredProfile());
  const [range, setRange] = useState<RangeId>("all");

  useEffect(() => {
    const load = () => {
      setStats(readUserStats());
      setProfile(getStoredProfile());
    };

    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "lenuk-user-stats-v1" || event.key.startsWith("lenuk-user-")) {
        load();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const view = useMemo(() => buildStatsView(stats, range), [stats, range]);

  const handleReset = () => {
    clearUserStats();
    setStats(readUserStats());
  };

  const handleExport = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lenuktype-user-stats.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const joinedAt = formatJoinedDate(view.stats.createdAt);
  const hasRuns = view.hasAnyRuns;

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_6%,hsl(var(--primary)/0.18),transparent_32%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.14),transparent_28%),linear-gradient(180deg,transparent_0%,hsl(var(--primary)/0.04)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.22)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.22)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
      />

      <div className="space-y-5 md:space-y-6">
        <Card className="relative overflow-hidden border border-border/80 bg-card/84 shadow-2xl shadow-black/10 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_-12%,hsl(var(--primary)/0.22),transparent_40%),radial-gradient(circle_at_100%_0,hsl(var(--primary)/0.12),transparent_32%)]"
          />
          <CardContent className="relative space-y-6 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Lenuk Type stats
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight md:text-4xl">
                    <span>{profile.name || "Guest typist"}</span>
                    {profile.country ? <CountryFlag code={profile.country} className="shadow-sm" /> : null}
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                    Your local command center for speed, accuracy, activity, and personal bests. Monkeytype energy, rebuilt for Lenuk
                    Type with a cleaner local-first view.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <InfoPill label="Joined" value={joinedAt} />
                  <InfoPill label="Completed" value={view.stats.totals.testsCompleted} />
                  <InfoPill label="Started" value={view.stats.totals.testsStarted} />
                  <InfoPill label="Completion" value={`${view.completionRate}%`} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href="/"
                  className="group inline-flex h-10 items-center gap-2 rounded-md border border-border/80 bg-background/80 px-3 text-sm font-medium transition hover:border-primary/50 hover:text-primary"
                >
                  <Home className="h-4 w-4" />
                  Back to typing
                </Link>
                <Button variant="ghost" className="h-10 px-3" onClick={handleExport} disabled={!hasRuns}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset stats
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
              <div className="rounded-2xl border border-border/70 bg-background/50 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current scope</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{view.range.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{view.scopeDescription}</p>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    Last local sync
                    <br />
                    <span className="font-medium text-foreground">{view.stats.updatedAt ? formatDate(view.stats.updatedAt) : "waiting for first run"}</span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRange(option.id)}
                      className={`rounded-2xl border px-4 py-2 font-mono text-sm transition ${
                        option.id === range
                          ? "border-primary/35 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border/80 bg-background/70 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Scope filters update overview, trend, and run history. The activity map below always shows the latest 12 months.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(160deg,hsl(var(--background)/0.75),hsl(var(--background)/0.45))] p-4 shadow-sm backdrop-blur">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">All-time peak</p>
                {view.bestOverall ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-4xl font-semibold tracking-tight text-primary md:text-5xl">{view.bestOverall.wpm}</p>
                        <p className="mt-1 text-sm text-muted-foreground">WPM personal best</p>
                      </div>
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                        <p className="font-mono text-lg font-semibold">{view.bestOverall.accuracy}%</p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">accuracy</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <MiniMetric label="Duration" value={`${view.bestOverall.durationSeconds}s`} />
                      <MiniMetric label="Difficulty" value={view.bestOverall.difficulty} capitalize />
                      <MiniMetric label="Errors" value={view.bestOverall.errors} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hit on {formatDate(view.bestOverall.at)}. Bests remain on this device until you clear browser storage.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
                    Finish your first run to unlock a true Lenuk Type peak stat block.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Runs" value={view.filteredRunsDesc.length} detail={range === "all" ? "all completed runs" : view.scopeLabel} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Average speed" value={view.avgWpm} suffix="wpm" detail={`raw ${view.avgRawWpm} wpm`} />
          <MetricCard icon={<Trophy className="h-4 w-4" />} label="Peak speed" value={view.bestWpm} suffix="wpm" detail={view.bestScopeRun ? `${view.bestScopeRun.durationSeconds}s / ${view.bestScopeRun.difficulty}` : "no runs yet"} />
          <MetricCard icon={<Target className="h-4 w-4" />} label="Accuracy" value={view.characterAccuracy} suffix="%" detail={`best ${view.bestAccuracy}%`} />
          <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Time typed" value={formatDuration(view.filteredTimeTypingSeconds)} detail={`${view.filteredTypedChars.toLocaleString()} chars`} />
          <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Consistency" value={view.consistency} suffix="%" detail={`${view.averageRunsPerActiveDay} runs / active day`} />
          <MetricCard icon={<Flame className="h-4 w-4" />} label="Current streak" value={view.currentStreak} suffix="days" detail={`best ${view.bestStreak} days`} />
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Error rate" value={view.errorRate} suffix="%" detail={`${view.filteredErrors} total errors`} />
        </section>

        <Card className="border border-border/80 bg-card/84 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="space-y-5 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Activity map</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Last 12 months of Lenuk Type sessions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A denser local activity view inspired by Monkeytype, tuned to your runs and your browser only.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-right text-sm">
                <p className="font-mono text-lg font-semibold">{view.heatmap.totalTests}</p>
                <p className="text-xs text-muted-foreground">tests in last 12 months</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3 overflow-hidden rounded-2xl border border-border/70 bg-background/55 p-3 md:p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>less</span>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={level} className={`h-3.5 w-3.5 rounded-[4px] border ${heatmapCellClass(level as 0 | 1 | 2 | 3 | 4, false)}`} />
                    ))}
                  </div>
                  <span>more</span>
                </div>

                <div className="overflow-x-auto pb-1">
                  <div className="inline-flex min-w-full gap-2">
                    <div className="grid shrink-0 grid-rows-7 gap-1 pt-4 text-[11px] text-muted-foreground">
                      {Array.from({ length: 7 }).map((_, rowIndex) => {
                        const label = DAY_LABELS.find((day) => day.row === rowIndex)?.label ?? "";
                        return (
                          <div key={rowIndex} className="flex h-3.5 items-center pr-1">
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-1 text-[11px] text-muted-foreground">
                        {view.heatmap.weeks.map((week, weekIndex) => {
                          const firstCell = week[0];
                          const previousCell = weekIndex > 0 ? view.heatmap.weeks[weekIndex - 1]?.[0] : null;
                          const showLabel = weekIndex === 0 || firstCell.date.getMonth() !== previousCell?.date.getMonth();
                          return <div key={`month-${weekIndex}`} className="w-[14px]">{showLabel ? monthFormatter.format(firstCell.date).toLowerCase().slice(0, 3) : ""}</div>;
                        })}
                      </div>

                      <div className="flex gap-1">
                        {view.heatmap.weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="grid grid-rows-7 gap-1">
                            {week.map((cell) => (
                              <div
                                key={cell.key}
                                title={`${cell.count} run${cell.count === 1 ? "" : "s"} on ${formatShortDate(cell.date)}`}
                                className={`h-3.5 w-3.5 rounded-[4px] border transition ${heatmapCellClass(cell.level, cell.isFuture)}`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Activity is grouped by local day. Empty squares mean no completed local runs were stored for that day.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SideStat label="Active days" value={view.heatmap.activeDays} detail="days with at least one saved run" icon={<Activity className="h-4 w-4" />} />
                <SideStat label="Current streak" value={view.currentStreak} detail="consecutive active days from your latest session" icon={<Flame className="h-4 w-4" />} />
                <SideStat label="Best streak" value={view.bestStreak} detail="longest local run streak so far" icon={<Trophy className="h-4 w-4" />} />
                <SideStat label="Latest run" value={view.latestRun ? formatRelativeTime(view.latestRun.at) : "none"} detail={view.latestRun ? `${view.latestRun.wpm} wpm / ${view.latestRun.accuracy}%` : "waiting for activity"} icon={<Clock3 className="h-4 w-4" />} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <Card className="border border-border/80 bg-card/84 shadow-xl shadow-black/5 backdrop-blur">
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Trend</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">Recent pace in the current scope</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Each bar is one run. Taller bars mean faster WPM. Cleaner rows should push both speed and accuracy together.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-right">
                  <p className="font-mono text-lg font-semibold">{view.hasFilteredRuns ? view.chartRuns.length : 0}</p>
                  <p className="text-xs text-muted-foreground">runs visualized</p>
                </div>
              </div>

              {view.hasFilteredRuns ? (
                <div className="space-y-4">
                  <div className="relative h-60 overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.72),hsl(var(--background)/0.5))] p-4">
                    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.14)_1px,transparent_1px),linear-gradient(to_top,hsl(var(--border)/0.14)_1px,transparent_1px)] bg-[size:34px_34px]" />
                    <div className="relative flex h-full items-end justify-between gap-2">
                      {view.chartRuns.map((run, index) => {
                        const peak = view.bestWpm > 0 ? view.bestWpm : 1;
                        const heightPercent = Math.max(8, Math.round((run.wpm / peak) * 100));
                        return (
                          <div key={`${run.id}-${index}`} className="group relative flex h-full flex-1 items-end">
                            <div className="absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-border/70 bg-background/95 px-2 py-1 text-xs shadow-lg group-hover:block">
                              <div className="font-semibold tabular-nums">{run.wpm} wpm</div>
                              <div className="text-muted-foreground">{run.accuracy}% / {run.durationSeconds}s</div>
                            </div>
                            <div className="w-full rounded-t-[14px] bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--primary)/0.38))] shadow-[0_8px_24px_hsl(var(--primary)/0.24)] transition-transform duration-200 group-hover:-translate-y-1" style={{ height: `${heightPercent}%` }} aria-label={`${run.wpm} wpm`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <InsightCard label="Best in scope" value={view.bestScopeRun ? `${view.bestScopeRun.wpm} wpm` : "-"} detail={view.bestScopeRun ? `${view.bestScopeRun.accuracy}% accuracy / ${formatShortDate(view.bestScopeRun.at)}` : "no data"} />
                    <InsightCard label="Character output" value={view.filteredTypedChars.toLocaleString()} detail={`${view.filteredCorrectChars.toLocaleString()} correct`} />
                    <InsightCard label="Accuracy mode" value={`${view.avgAccuracy}%`} detail={`${view.filteredErrors} total errors in scope`} />
                  </div>
                </div>
              ) : (
                <EmptyScopeState hasAnyRuns={view.hasAnyRuns} onResetScope={() => setRange("all")} />
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/84 shadow-xl shadow-black/5 backdrop-blur">
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Personal bests</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">All-time by duration</h2>
                </div>
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  New run
                </Link>
              </div>

              <div className="space-y-3">
                {view.durationCards.map(({ label, run }) => (
                  <DurationCard key={label} label={label} run={run} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/80 bg-card/84 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Run history</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Recent runs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Local-first history with the latest result on top. Filtered by {view.scopeLabel}.
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Showing {view.displayRuns.length} of {view.filteredRunsDesc.length} runs
              </div>
            </div>

            {view.hasFilteredRuns ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {view.displayRuns.map((run) => (
                    <article key={run.id} className="rounded-2xl border border-border/70 bg-background/55 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-2xl font-semibold text-primary">{run.wpm}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">wpm</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatRelativeTime(run.at)}</p>
                          <p>{formatDate(run.at)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <MiniMetric label="Accuracy" value={`${run.accuracy}%`} />
                        <MiniMetric label="Difficulty" value={run.difficulty} capitalize />
                        <MiniMetric label="Errors" value={run.errors} />
                        <MiniMetric label="Duration" value={`${run.durationSeconds}s`} />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-auto rounded-2xl border border-border/70 bg-background/55 md:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-card/90">
                      <tr className="border-b border-border/70">
                        <Th>When</Th>
                        <Th align="right">WPM</Th>
                        <Th align="right">Raw</Th>
                        <Th align="right">Accuracy</Th>
                        <Th align="right">Errors</Th>
                        <Th>Difficulty</Th>
                        <Th align="right">Duration</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.displayRuns.map((run) => (
                        <tr key={run.id} className="border-b border-border/60 last:border-0 hover:bg-primary/5">
                          <Td>
                            <div>
                              <p className="font-medium">{formatRelativeTime(run.at)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(run.at)}</p>
                            </div>
                          </Td>
                          <Td align="right" className="font-mono text-lg font-semibold text-primary">{run.wpm}</Td>
                          <Td align="right" className="font-mono text-muted-foreground">{run.rawWpm}</Td>
                          <Td align="right" className="font-mono">{run.accuracy}%</Td>
                          <Td align="right" className="font-mono">{run.errors}</Td>
                          <Td>
                            <span className="inline-flex rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium capitalize">{run.difficulty}</span>
                          </Td>
                          <Td align="right" className="font-mono">{run.durationSeconds}s</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyScopeState hasAnyRuns={view.hasAnyRuns} onResetScope={() => setRange("all")} />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 shadow-md shadow-black/5 backdrop-blur">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-base font-semibold">Privacy first</p>
              <p className="text-sm text-muted-foreground">
                Every stat on this page is saved to browser local storage only. Export anytime or reset the profile when you want a clean slate.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Local only
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
                Export anytime
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SiteCreditsFooter className="mt-5" />
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  suffix,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  suffix?: string;
  detail: string;
}) {
  return (
    <Card className="border border-border/80 bg-card/84 shadow-lg shadow-black/5 backdrop-blur">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span className="font-mono uppercase tracking-[0.14em]">{label}</span>
        </div>
        <div className="flex items-end gap-2">
          <p className="font-mono text-3xl font-semibold tracking-tight md:text-4xl">{value}</p>
          {suffix ? <span className="pb-1 text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SideStat({ label, value, detail, icon }: { label: string; value: ReactNode; detail: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/55 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="font-mono uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, capitalize = false }: { label: string; value: ReactNode; capitalize?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/55 p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function DurationCard({ label, run }: { label: string; run: StoredRun | null }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/55 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-sm text-muted-foreground">{run ? "Locked PB" : "No PB yet"}</p>
        </div>
        {run ? <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">PB</span> : null}
      </div>

      {run ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-3xl font-semibold tracking-tight text-primary">{run.wpm}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">wpm</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-right">
              <p className="font-mono font-semibold">{run.accuracy}%</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">accuracy</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <MiniMetric label="Difficulty" value={run.difficulty} capitalize />
            <MiniMetric label="Errors" value={run.errors} />
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(run.at)}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Finish a run of this length to create a personal best snapshot.</p>
      )}
    </div>
  );
}

function EmptyScopeState({ hasAnyRuns, onResetScope }: { hasAnyRuns: boolean; onResetScope: () => void }) {
  if (hasAnyRuns) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/55 px-4 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-semibold">No runs in this range</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Your local stats exist, but this scope is empty. Switch back to all time or run a few fresh tests to populate it.
        </p>
        <Button variant="ghost" className="border bg-background/70" onClick={onResetScope}>
          Show all time
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/55 px-4 py-10 text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground" />
      <p className="text-base font-semibold">No runs yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Start a Lenuk Type run to unlock activity, pace trends, and a complete local stats dashboard.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to typing zone
      </Link>
    </div>
  );
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>{children}</td>;
}
