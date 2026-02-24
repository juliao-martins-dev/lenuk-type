"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LeaderboardItem {
  id: string;
  createdAt: string;
  userId: string;
  mode: string;
  difficulty: string;
  durationSeconds: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/results", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "failed");
        if (active) {
          setItems(data.results ?? []);
          setStatus("live");
        }
      } catch {
        if (active) setStatus("error");
      }
    }

    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Live Leaderboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Status: {status}</p>
              <Link href="/" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to typing</Link>
            </div>
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <Th>#</Th>
                  <Th>User</Th>
                  <Th>WPM</Th>
                  <Th>Raw</Th>
                  <Th>Accuracy</Th>
                  <Th>Errors</Th>
                  <Th>Mode</Th>
                  <Th>Difficulty</Th>
                  <Th>Duration</Th>
                  <Th>Last Time</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-t">
                    <Td>{index + 1}</Td>
                    <Td>{item.userId}</Td>
                    <Td>{item.wpm}</Td>
                    <Td>{item.rawWpm}</Td>
                    <Td>{item.accuracy}%</Td>
                    <Td>{item.errors}</Td>
                    <Td>{item.mode}</Td>
                    <Td>{item.difficulty}</Td>
                    <Td>{item.durationSeconds}s</Td>
                    <Td>{new Date(item.createdAt).toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium text-muted-foreground">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
