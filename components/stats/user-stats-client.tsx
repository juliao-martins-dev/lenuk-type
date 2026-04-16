"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  TrendingUp,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { clearUserStats, readUserStats, type StoredRun, type UserStats } from "@/lib/user-stats";
import { WpmHeatmap } from "./wpm-heatmap";
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

const RANGE_KEY_MAP: Record<string, string> = {
  day:     "rangeDay",
  week:    "rangeWeek",
  month:   "rangeMonth",
  quarter: "rangeQuarter",
  all:     "rangeAll",
};

export default function UserStatsClient() {
  const { t, i18n } = useTranslation();
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

  const joinedAt = formatJoinedDate(view.stats.createdAt, i18n.language);
  const hasRuns = view.hasAnyRuns;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:py-8">
      <div className="space-y-8">
        {/* ── HERO ── */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--caret)/0.12)] text-[hsl(var(--caret))] ring-1 ring-[hsl(var(--caret)/0.25)]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsTitle")}</p>
                <div className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
                  <span>{profile.name || t("statsGuestName")}</span>
                  {profile.country ? <CountryFlag code={profile.country} className="shadow-sm" /> : null}
                </div>
                <p className="text-sm text-[hsl(var(--sub))]">
                  {joinedAt} · {view.stats.totals.testsCompleted} {t("statsLabelCompleted").toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-[hsl(var(--sub))] transition hover:text-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                {t("statsBtnBack")}
              </Link>
              <Button variant="ghost" size="sm" className="h-9 px-3 text-xs" onClick={handleExport} disabled={!hasRuns}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {t("statsBtnExport")}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 px-3 text-xs text-destructive hover:text-destructive" onClick={handleReset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t("statsBtnReset")}
              </Button>
            </div>
          </div>

          {/* All-time best hero banner */}
          {view.bestOverall ? (
            <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--caret)/0.2)] bg-gradient-to-br from-[hsl(var(--caret)/0.08)] via-transparent to-transparent p-5 md:p-6">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[hsl(var(--caret)/0.12)] blur-3xl" />
              <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsAllTimeBest")}</p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-6xl font-extrabold tabular-nums leading-none tracking-tight text-[hsl(var(--caret))] md:text-7xl">
                      {view.bestOverall.wpm}
                    </span>
                    <span className="text-lg font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">wpm</span>
                  </div>
                  <p className="mt-2 text-sm text-[hsl(var(--sub))]">
                    {view.bestOverall.accuracy}% {t("statsColAccuracy").toLowerCase()} · {t("statsLabelCompletion")} {view.completionRate}%
                  </p>
                </div>
                <div className="text-right text-xs text-[hsl(var(--sub))]">
                  <p className="font-semibold uppercase tracking-[0.15em]">{t("statsLabelUpdated")}</p>
                  <p className="mt-1 tabular-nums">{view.stats.updatedAt ? formatRelativeTime(view.stats.updatedAt, i18n.language) : t("statsNever")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Range pill selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsScope")}</p>
              <p className="mt-1 text-sm text-foreground">{view.scopeDescription}</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-card/50 p-1 backdrop-blur">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRange(option.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    option.id === range
                      ? "bg-[hsl(var(--caret))] text-[hsl(var(--background))]"
                      : "text-[hsl(var(--sub))] hover:text-foreground"
                  }`}
                >
                  {t(RANGE_KEY_MAP[option.id] ?? "rangeAll")}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard icon={<Activity className="h-4 w-4" />} label={t("statsMetricRuns")} value={view.filteredRunsDesc.length} detail={range === "all" ? t("statsAllRuns") : view.scopeLabel} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={t("statsMetricSpeed")} value={view.avgWpm} suffix="wpm" detail={t("statsBestWpm", { n: view.bestWpm })} highlight />
          <MetricCard icon={<Target className="h-4 w-4" />} label={t("statsColAccuracy")} value={view.characterAccuracy} suffix="%" detail={t("statsAvgAccLabel", { n: view.avgAccuracy })} />
          <MetricCard icon={<Clock3 className="h-4 w-4" />} label={t("statsMetricTimeTyped")} value={formatDuration(view.filteredTimeTypingSeconds)} detail={t("statsCharsTyped", { n: view.filteredTypedChars.toLocaleString() })} />
          <MetricCard icon={<Flame className="h-4 w-4" />} label={t("statsMetricStreak")} value={view.currentStreak} suffix={t("statsSuffixDays")} detail={t("statsBestDays", { n: view.bestStreak })} />
          <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label={t("statsMetricConsistency")} value={view.consistency} suffix="%" detail={t("statsErrorsInScope", { n: view.filteredErrors })} />
        </section>

        <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsActivity")}</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight">{t("statsActivityDesc")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--sub))]">
              <span><b className="tabular-nums text-foreground">{view.heatmap.totalTests}</b> {t("statsTests")}</span>
              <span className="text-border">·</span>
              <span><b className="tabular-nums text-foreground">{view.heatmap.activeDays}</b> {t("statsActiveDays")}</span>
              <span className="text-border">·</span>
              <span>{view.latestRun ? t("statsLatestRun", { time: formatRelativeTime(view.latestRun.at, i18n.language) }) : t("statsNoActivity")}</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-end gap-2 text-xs text-[hsl(var(--sub))]">
                <span>{t("statsLess")}</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span key={level} className={`h-3 w-3 rounded-[3px] border ${heatmapCellClass(level as 0 | 1 | 2 | 3 | 4, false)}`} />
                  ))}
                </div>
                <span>{t("statsMore")}</span>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-flex min-w-full gap-2">
                  <div className="grid shrink-0 grid-rows-7 gap-1 pt-4 text-[11px] text-muted-foreground">
                    {Array.from({ length: 7 }).map((_, rowIndex) => {
                      const label = DAY_LABELS.find((day) => day.row === rowIndex)?.label ?? "";
                      return (
                        <div key={rowIndex} className="flex h-3 items-center pr-1">
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
                        return (
                          <div key={`month-${weekIndex}`} className="w-[13px]">
                            {showLabel ? monthFormatter.format(firstCell.date).toLowerCase().slice(0, 3) : ""}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-1">
                      {view.heatmap.weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-rows-7 gap-1">
                          {week.map((cell) => (
                            <div
                              key={cell.key}
                              title={`${cell.count} run${cell.count === 1 ? "" : "s"} on ${formatShortDate(cell.date, i18n.language)}`}
                              className={`h-3 w-3 rounded-[3px] border ${heatmapCellClass(cell.level, cell.isFuture)}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        {view.bestOverall?.keystrokeLog && view.bestOverall.promptText ? (
          <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">
                  <Zap className="h-3 w-3 text-[hsl(var(--caret))]" />
                  {t("statsHeatmapTitle")}
                </p>
                <h2 className="text-lg font-bold tracking-tight">{t("statsHeatmapDesc")}</h2>
              </div>
            </div>
            <WpmHeatmap
              text={view.bestOverall.promptText}
              keystrokeLog={view.bestOverall.keystrokeLog}
              wpm={view.bestOverall.wpm}
              accuracy={view.bestOverall.accuracy}
            />
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsRecentPace")}</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">{t("statsRecentPaceDesc")}</h2>
              </div>
              <span className="text-xs font-medium text-[hsl(var(--sub))]">{t("statsRunsShown", { n: view.chartRuns.length })}</span>
            </div>

            {view.hasFilteredRuns ? (
              <div className="space-y-4">
                <div className="relative flex h-48 items-end gap-2 rounded-xl bg-background/40 p-3">
                  {view.chartRuns.map((run, index) => {
                    const peak = view.bestWpm > 0 ? view.bestWpm : 1;
                    const heightPercent = Math.max(10, Math.round((run.wpm / peak) * 100));
                    const isPeak = run.wpm === view.bestWpm && view.bestWpm > 0;
                    return (
                      <div key={`${run.id}-${index}`} className="group relative flex h-full flex-1 items-end">
                        <div
                          title={`${run.wpm} wpm / ${run.accuracy}% / ${run.durationSeconds}s`}
                          className={`w-full rounded-t-md transition-all ${
                            isPeak
                              ? "bg-[hsl(var(--caret))] shadow-[0_0_18px_hsl(var(--caret)/0.35)]"
                              : "bg-[hsl(var(--caret)/0.55)] group-hover:bg-[hsl(var(--caret))]"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <MiniMetric label={t("statsBestInScope")} value={view.bestScopeRun ? `${view.bestScopeRun.wpm} wpm` : "-"} />
                  <MiniMetric label={t("statsCharacters")} value={view.filteredTypedChars.toLocaleString()} />
                  <MiniMetric label={t("statsColErrors")} value={view.filteredErrors} />
                </div>
              </div>
            ) : (
              <EmptyScopeState hasAnyRuns={view.hasAnyRuns} onResetScope={() => setRange("all")} />
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsBestByDur")}</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">{t("statsBestByDurDesc")}</h2>
              </div>
            </div>

            <div className="space-y-3">
              {view.durationCards.map(({ label, run }) => (
                <DurationCard key={label} label={label} run={run} />
              ))}
            </div>
          </section>
        </div>

        <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsRecentRuns")}</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight">{t("statsRecentRunsDesc", { scope: view.scopeLabel })}</h2>
            </div>
            <span className="text-xs font-medium text-[hsl(var(--sub))]">{t("statsShowingOf", { shown: view.displayRuns.length, total: view.filteredRunsDesc.length })}</span>
          </div>

          {view.hasFilteredRuns ? (
            <>
              <div className="grid gap-3 md:hidden">
                {view.displayRuns.map((run) => (
                  <article key={run.id} className="rounded-xl border border-border/40 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-3xl font-bold tabular-nums text-[hsl(var(--caret))]">{run.wpm}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">{t("statsColWpm")}</p>
                      </div>
                      <div className="text-right text-xs text-[hsl(var(--sub))]">
                        <p className="font-medium text-foreground">{formatRelativeTime(run.at, i18n.language)}</p>
                        <p className="mt-0.5 tabular-nums">{formatDate(run.at)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <MiniMetric label={t("statsColAccuracy")} value={`${run.accuracy}%`} />
                      <MiniMetric label={t("statsColDifficulty")} value={run.difficulty} capitalize />
                      <MiniMetric label={t("statsColErrors")} value={run.errors} />
                      <MiniMetric label={t("statsColDuration")} value={`${run.durationSeconds}s`} />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-auto rounded-xl border border-border/40 md:block">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <Th>{t("statsColWhen")}</Th>
                      <Th align="right">{t("statsColWpm")}</Th>
                      <Th align="right">{t("statsColAccuracy")}</Th>
                      <Th align="right">{t("statsColErrors")}</Th>
                      <Th>{t("statsColDifficulty")}</Th>
                      <Th align="right">{t("statsColDuration")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.displayRuns.map((run) => {
                      const isPeak = run.wpm === view.bestWpm && view.bestWpm > 0;
                      return (
                        <tr
                          key={run.id}
                          className="border-b border-border/30 transition-colors last:border-0 hover:bg-[hsl(var(--caret)/0.05)]"
                        >
                          <Td>
                            <div>
                              <p className="font-medium">{formatRelativeTime(run.at, i18n.language)}</p>
                              <p className="text-xs text-[hsl(var(--sub))] tabular-nums">{formatDate(run.at)}</p>
                            </div>
                          </Td>
                          <Td align="right" className={`font-bold tabular-nums ${isPeak ? "text-[hsl(var(--caret))]" : ""}`}>{run.wpm}</Td>
                          <Td align="right" className="tabular-nums">{run.accuracy}%</Td>
                          <Td align="right" className="tabular-nums text-[hsl(var(--sub))]">{run.errors}</Td>
                          <Td><span className="capitalize text-[hsl(var(--sub))]">{run.difficulty}</span></Td>
                          <Td align="right" className="tabular-nums text-[hsl(var(--sub))]">{run.durationSeconds}s</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyScopeState hasAnyRuns={view.hasAnyRuns} onResetScope={() => setRange("all")} />
          )}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/30 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">{t("statsPrivacy")}</p>
            <p className="mt-1 text-sm text-foreground">{t("statsPrivacyDesc")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InfoPill label={t("statsStorage")} value={t("statsLocalOnly")} />
            <InfoPill label={t("statsExportLabel")} value="JSON" />
          </div>
        </section>
      </div>

      <SiteCreditsFooter className="mt-5" />
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/50 px-3 py-1 text-xs backdrop-blur">
      <span className="font-semibold uppercase tracking-[0.1em] text-[hsl(var(--sub))]">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  suffix,
  detail,
  highlight = false
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  suffix?: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/50 p-4 transition-colors hover:border-[hsl(var(--caret)/0.35)] hover:bg-card/80">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">
        <span className="text-[hsl(var(--caret))]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p className={`text-4xl font-bold tracking-tight tabular-nums ${highlight ? "text-[hsl(var(--caret))]" : "text-foreground"}`}>
          {value}
        </p>
        {suffix ? <span className="pb-1.5 text-xs font-medium uppercase tracking-wider text-[hsl(var(--sub))]">{suffix}</span> : null}
      </div>
      <p className="mt-2 text-xs text-[hsl(var(--sub))]">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, capitalize = false }: { label: string; value: ReactNode; capitalize?: boolean }) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function DurationCard({ label, run }: { label: string; run: StoredRun | null }) {
  const { t } = useTranslation();
  return (
    <div className={`rounded-xl border p-4 transition-colors ${run ? "border-[hsl(var(--caret)/0.25)] bg-[hsl(var(--caret)/0.04)]" : "border-border/30 bg-background/30"}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">
            {run ? t("statsSavedPB") : t("statsNoResult")}
          </p>
        </div>
        {run ? (
          <span className="rounded-full bg-[hsl(var(--caret)/0.15)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--caret))]">
            {t("statsPB")}
          </span>
        ) : null}
      </div>

      {run ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold tracking-tight tabular-nums text-[hsl(var(--caret))]">{run.wpm}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))]">{t("statsColWpm")}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{run.accuracy}%</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <MiniMetric label={t("statsColDifficulty")} value={run.difficulty} capitalize />
            <MiniMetric label={t("statsColErrors")} value={run.errors} />
          </div>
          <p className="text-[11px] text-[hsl(var(--sub))] tabular-nums">{formatDate(run.at)}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[hsl(var(--sub))]">{t("statsFinishRun")}</p>
      )}
    </div>
  );
}

function EmptyScopeState({ hasAnyRuns, onResetScope }: { hasAnyRuns: boolean; onResetScope: () => void }) {
  const { t } = useTranslation();
  if (hasAnyRuns) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-semibold">{t("statsNoRunsRange")}</p>
        <p className="max-w-md text-sm text-muted-foreground">{t("statsNoRunsRangeDesc")}</p>
        <Button variant="ghost" className="border bg-background/70" onClick={onResetScope}>
          {t("statsShowAllTime")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground" />
      <p className="text-base font-semibold">{t("statsNoRunsYet")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{t("statsNoRunsYetDesc")}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("statsBtnBack")}
      </Link>
    </div>
  );
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--sub))] ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>{children}</td>;
}
