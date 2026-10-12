import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { ForecastChart } from "./ForecastChart.tsx";
import type { TaskRepository, WipPoint } from "../../data/repository.ts";
import { renderWithChakra } from "../../test/render.tsx";
import { addDays } from "../../dates.ts";

/** 2026-08-03 (月) からの欠けのない10週に、throughput の値を順にくり返して終えるリポジトリ */
function repoWith(throughput: number | number[], openTodos: number): TaskRepository {
  const values = [throughput].flat();
  const week = (i: number): WipPoint => ({ period: addDays("2026-08-03", 7 * i), days: 7, wip: 0, throughput: values[i % values.length], avgLead: null });
  return {
    wipByPeriod: () => Array.from({ length: 10 }, (_, i) => week(i)),
    agingTodos: () => Array.from({ length: openTodos }, (_, i) => ({ title: `t${i}`, days: 1 })),
  } as unknown as TaskRepository;
}

describe("ForecastChart", () => {
  it("forecasts the TODOs touched in the range and the next four weeks", () => {
    renderWithChakra(<ForecastChart repo={repoWith(2, 6)} startedAt="2026-09-12" asOf="2026-10-12" />);
    // 毎週2件なら6件は3週。4週では8件
    expect(screen.getByText(/^範囲内に触った TODO 6件を終えるまで: 50% の確率で 3週以内 \(2026-11-02 まで\)/)).toBeInTheDocument();
    expect(screen.getByText(/^次の4週で終える件数: 50% の確率で 8件以上/)).toBeInTheDocument();
  });

  it("forecasts only the next weeks without TODOs", () => {
    renderWithChakra(<ForecastChart repo={repoWith(2, 0)} startedAt="2026-09-12" asOf="2026-10-12" />);
    expect(screen.queryByText(/を終えるまで/)).not.toBeInTheDocument();
    expect(screen.getByText(/^次の4週で終える件数/)).toBeInTheDocument();
  });

  it("promises fewer items at higher confidence", () => {
    renderWithChakra(<ForecastChart repo={repoWith([0, 4], 1)} startedAt="2026-09-12" asOf="2026-10-12" />);
    const text = screen.getByText(/^次の4週で終える件数/).textContent!;
    const [p50, p85, p95] = [...text.matchAll(/(\d+)件以上/g)].map((m) => Number(m[1]));
    expect(p85).toBeLessThan(p50);
    expect(p95).toBeLessThanOrEqual(p85);
  });

  it("says when the TODOs would not be done within ten years", () => {
    // 平均で週 0.25 件なので 200 件は 520 週で終わらない
    renderWithChakra(<ForecastChart repo={repoWith([0, 0, 0, 1], 200)} startedAt="2026-09-12" asOf="2026-10-12" />);
    expect(screen.getByText(/50% の確率では 520週でも終わらない/)).toBeInTheDocument();
  });

  it("says it cannot forecast when no week finished anything", () => {
    renderWithChakra(<ForecastChart repo={repoWith(0, 3)} startedAt="2026-09-12" asOf="2026-10-12" />);
    expect(screen.getByText(/過去の週はどれも完了 0 件なので予測できない/)).toBeInTheDocument();
  });
});
