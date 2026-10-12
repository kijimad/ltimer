import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Box, Text } from "@chakra-ui/react";
import type { TaskRepository } from "../../data/repository.ts";
import { forecastItems, forecastWeeks, historyStart, isCompletePeriod, quantile, seededRandom, MAX_FORECAST_WEEKS } from "../../metrics.ts";
import { addDays } from "../../dates.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  asOf: string;
}

const CONFIDENCES = [0.5, 0.85, 0.95];
const SEED = 1;
const WEEKS = 4;

export function ForecastChart({ repo, startedAt, asOf }: Props) {
  const { weekly, items } = useMemo(() => {
    const points = repo.wipByPeriod(historyStart(startedAt, asOf, "week"), "week");
    return {
      weekly: points.filter((p) => isCompletePeriod(p, "week", asOf)).map((p) => p.throughput),
      items: repo.agingTodos(startedAt, asOf).length,
    };
  }, [repo, startedAt, asOf]);

  const when = useMemo(() => (items > 0 ? forecastWeeks(weekly, items, seededRandom(SEED)) : null), [weekly, items]);
  const howMany = useMemo(() => forecastItems(weekly, WEEKS, seededRandom(SEED)), [weekly]);
  const distribution = useMemo(() => {
    if (!when) return [];
    const counts = new Map<number, number>();
    for (const w of when.filter(Number.isFinite)) counts.set(w, (counts.get(w) ?? 0) + 1);
    return [...counts].map(([w, n]) => ({ weeks: w, share: Math.round((1000 * n) / when.length) / 10 }));
  }, [when]);

  const p85 = when ? quantile(when, 0.85) : null;

  if (weekly.length === 0) return <Text color="gray.500">欠けのない週がまだない</Text>;

  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={2}>過去 {weekly.length} 週の週ごとの完了数を、1万回引き直して予測する</Text>
      {items > 0 && (
        <Text fontSize="sm" color="gray.700" mb={1}>
          範囲内に触った TODO {items}件を終えるまで:{" "}
          {when === null
            ? "過去の週はどれも完了 0 件なので予測できない"
            : CONFIDENCES.map((p) => {
                const w = quantile(when, p);
                return Number.isFinite(w) ? `${p * 100}% の確率で ${w}週以内 (${addDays(asOf, 7 * w)} まで)` : `${p * 100}% の確率では ${MAX_FORECAST_WEEKS}週でも終わらない`;
              }).join(" / ")}
        </Text>
      )}
      <Text fontSize="sm" color="gray.700" mb={3}>
        次の{WEEKS}週で終える件数: {CONFIDENCES.map((p) => `${p * 100}% の確率で ${quantile(howMany, 1 - p)}件以上`).join(" / ")}
      </Text>
      {when && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={distribution} margin={{ top: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="weeks" stroke={AXIS_STROKE} unit="週" />
            <YAxis stroke={AXIS_STROKE} unit="%" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "試行の割合"]} labelFormatter={(w) => `${w}週で終わる`} />
            <Bar dataKey="share" fill="#58a6ff" isAnimationActive={false} />
            {p85 !== null && Number.isFinite(p85) && (
              <ReferenceLine x={p85} stroke="#f0883e" strokeWidth={2} strokeDasharray="4 4" label={{ value: "85%", position: "top", fontSize: 10, fill: "#f0883e" }} />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
