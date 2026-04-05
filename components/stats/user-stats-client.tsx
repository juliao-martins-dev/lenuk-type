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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="space-y-6">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t("statsTitle")}</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
                    <span>{profile.name || t("statsGuestName")}</span>
                    {profile.country ? <CountryFlag code={profile.country} className="shadow-sm" /> : null}
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">{t("statsSubtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <InfoPill label={t("statsLabelJoined")} value={joinedAt} />
                  <InfoPill label={t("statsLabelCompleted")} value={view.stats.totals.testsCompleted} />
                  <InfoPill label={t("statsLabelCompletion")} value={`${view.completionRate}%`} />
                  <InfoPill label={t("statsLabelUpdated")} value={view.stats.updatedAt ? formatRelativeTime(view.stats.updatedAt, i18n.language) : t("statsNever")} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  <Home className="h-4 w-4" />
                  {t("statsBtnBack")}
                </Link>
                <Button variant="ghost" className="h-10 border border-border px-3" onClick={handleExport} disabled={!hasRuns}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("statsBtnExport")}
                </Button>
                <Button variant="ghost" className="h-10 border border-border px-3 text-destructive" onClick={handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("statsBtnReset")}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t("statsScope")}</p>
                  <p className="text-sm text-muted-foreground">{view.scopeDescription}</p>
                </div>
                {view.bestOverall ? (
                  <div className="rounded-xl border border-border bg-background px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("statsAllTimeBest")}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{view.bestOverall.wpm} WPM</p>
                    <p className="text-sm text-muted-foreground">{view.bestOverall.accuracy}% {t("statsColAccuracy").toLowerCase()}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRange(option.id)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      option.id === range
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(RANGE_KEY_MAP[option.id] ?? "rangeAll")}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard icon={<Activity className="h-4 w-4" />} label={t("statsMetricRuns")} value={view.filteredRunsDesc.length} detail={range === "all" ? t("statsAllRuns") : view.scopeLabel} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={t("statsMetricSpeed")} value={view.avgWpm} suffix="wpm" detail={t("statsBestWpm", { n: view.bestWpm })} />
          <MetricCard icon={<Target className="h-4 w-4" />} label={t("statsColAccuracy")} value={view.characterAccuracy} suffix="%" detail={t("statsAvgAccLabel", { n: view.avgAccuracy })} />
          <MetricCard icon={<Clock3 className="h-4 w-4" />} label={t("statsMetricTimeTyped")} value={formatDuration(view.filteredTimeTypingSeconds)} detail={t("statsCharsTyped", { n: view.filteredTypedChars.toLocaleString() })} />
          <MetricCard icon={<Flame className="h-4 w-4" />} label={t("statsMetricStreak")} value={view.currentStreak} suffix={t("statsSuffixDays")} detail={t("statsBestDays", { n: view.bestStreak })} />
          <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label={t("statsMetricConsistency")} value={view.consistency} suffix="%" detail={t("statsErrorsInScope", { n: view.filteredErrors })} />
        </section>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t("statsActivity")}</h2>
                <p className="text-sm text-muted-foreground">{t("statsActivityDesc")}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{view.heatmap.totalTests} {t("statsTests")}</span>
                <span>{view.heatmap.activeDays} {t("statsActiveDays")}</span>
                <span>{view.latestRun ? t("statsLatestRun", { time: formatRelativeTime(view.latestRun.at, i18n.language) }) : t("statsNoActivity")}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
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
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{t("statsRecentPace")}</h2>
                  <p className="text-sm text-muted-foreground">{t("statsRecentPaceDesc")}</p>
                </div>
                <span className="text-sm text-muted-foreground">{t("statsRunsShown", { n: view.chartRuns.length })}</span>
              </div>

              {view.hasFilteredRuns ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex h-48 items-end gap-2">
                      {view.chartRuns.map((run, index) => {
                        const peak = view.bestWpm > 0 ? view.bestWpm : 1;
                        const heightPercent = Math.max(10, Math.round((run.wpm / peak) * 100));
                        return (
                          <div key={`${run.id}-${index}`} className="group flex h-full flex-1 items-end">
                            <div
                              title={`${run.wpm} wpm / ${run.accuracy}% / ${run.durationSeconds}s`}
                              className="w-full rounded-t-md bg-primary/80 transition group-hover:bg-primary"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
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
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{t("statsBestByDur")}</h2>
                  <p className="text-sm text-muted-foreground">{t("statsBestByDurDesc")}</p>
                </div>
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  {t("statsBtnBack")}
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

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t("statsRecentRuns")}</h2>
                <p className="text-sm text-muted-foreground">{t("statsRecentRunsDesc", { scope: view.scopeLabel })}</p>
              </div>
              <span className="text-sm text-muted-foreground">{t("statsShowingOf", { shown: view.displayRuns.length, total: view.filteredRunsDesc.length })}</span>
            </div>

            {view.hasFilteredRuns ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {view.displayRuns.map((run) => (
                    <article key={run.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-2xl font-semibold tabular-nums">{run.wpm}</p>
                          <p className="text-xs text-muted-foreground">{t("statsColWpm")}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatRelativeTime(run.at, i18n.language)}</p>
                          <p>{formatDate(run.at)}</p>
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

                <div className="hidden overflow-auto rounded-xl border border-border md:block">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-muted/30">
                      <tr className="border-b border-border">
                        <Th>{t("statsColWhen")}</Th>
                        <Th align="right">{t("statsColWpm")}</Th>
                        <Th align="right">{t("statsColAccuracy")}</Th>
                        <Th align="right">{t("statsColErrors")}</Th>
                        <Th>{t("statsColDifficulty")}</Th>
                        <Th align="right">{t("statsColDuration")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.displayRuns.map((run) => (
                        <tr key={run.id} className="border-b border-border last:border-0">
                          <Td>
                            <div>
                              <p className="font-medium">{formatRelativeTime(run.at, i18n.language)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(run.at)}</p>
                            </div>
                          </Td>
                          <Td align="right" className="font-semibold tabular-nums">{run.wpm}</Td>
                          <Td align="right" className="tabular-nums">{run.accuracy}%</Td>
                          <Td align="right" className="tabular-nums">{run.errors}</Td>
                          <Td><span className="capitalize text-muted-foreground">{run.difficulty}</span></Td>
                          <Td align="right" className="tabular-nums">{run.durationSeconds}s</Td>
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

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-base font-semibold">{t("statsPrivacy")}</p>
              <p className="text-sm text-muted-foreground">{t("statsPrivacyDesc")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InfoPill label={t("statsStorage")} value={t("statsLocalOnly")} />
              <InfoPill label={t("statsExportLabel")} value="JSON" />
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
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
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
    <Card className="border-border/80 bg-card shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span>{label}</span>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {suffix ? <span className="pb-1 text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, capitalize = false }: { label: string; value: ReactNode; capitalize?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function DurationCard({ label, run }: { label: string; run: StoredRun | null }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{run ? t("statsSavedPB") : t("statsNoResult")}</p>
        </div>
        {run ? <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{t("statsPB")}</span> : null}
      </div>

      {run ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{run.wpm}</p>
              <p className="text-xs text-muted-foreground">{t("statsColWpm")}</p>
            </div>
            <p className="text-sm font-medium tabular-nums">{run.accuracy}%</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <MiniMetric label={t("statsColDifficulty")} value={run.difficulty} capitalize />
            <MiniMetric label={t("statsColErrors")} value={run.errors} />
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(run.at)}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("statsFinishRun")}</p>
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
    <th className={`px-4 py-3 text-xs font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>{children}</td>;
}
