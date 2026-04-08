import UserStatsClient from "@/components/stats/user-stats-client";
import { ErrorBoundary } from "@/components/error-boundary";

export default function StatsPage() {
  return (
    <ErrorBoundary>
      <UserStatsClient />
    </ErrorBoundary>
  );
}
