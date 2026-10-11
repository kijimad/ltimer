import { Box, Text } from "@chakra-ui/react";
import { scaleFrom, bandOf, type GaugeMetric, type Band } from "../metrics.ts";
import { GRID_STROKE, AXIS_STROKE } from "./charts/colors.ts";

const GOOD = "#3fb950";
const NORMAL = "#e3b341";
const BAD = "#f85149";
const NEEDLE = "#2d3748";

const CX = 100;
const CY = 100;
const R = 80;

/** 左端を 0、右端を 1 とする半円上の座標 */
function point(f: number, r = R): [number, number] {
  const theta = Math.PI * (1 - f);
  return [CX + r * Math.cos(theta), CY - r * Math.sin(theta)];
}

function arcPath(f0: number, f1: number): string {
  const [x0, y0] = point(f0);
  const [x1, y1] = point(f1);
  return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`;
}

function bandColor(band: Band, higherIsBetter: boolean): string {
  if (band === "mid") return NORMAL;
  return (band === "high") === higherIsBetter ? GOOD : BAD;
}

function format(v: number): string {
  return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}

export function Gauge({ metric }: { metric: GaugeMetric }) {
  const { label, desc, unit, value, history, higherIsBetter, target } = metric;
  const scale = scaleFrom(history, target);
  const frac = (v: number) => (scale ? Math.min(1, Math.max(0, (v - scale.min) / (scale.max - scale.min))) : 0);
  const band = scale && value !== null ? bandOf(value, scale) : null;
  const [nx, ny] = point(frac(value ?? 0), R - 18);
  const [tx0, ty0] = point(frac(target ?? 0), R - 11);
  const [tx1, ty1] = point(frac(target ?? 0), R + 11);

  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={3} textAlign="center">
      <Text fontSize="sm" fontWeight="bold" color="gray.700">{label}</Text>
      <Text fontSize="xs" color="gray.400" lineClamp={1} title={desc}>{desc}</Text>
      <svg viewBox="0 0 200 112" style={{ width: "100%", maxHeight: 110 }} role="img" aria-label={label}>
        {scale ? (
          <>
            <path d={arcPath(0, frac(scale.lo))} stroke={bandColor("low", higherIsBetter)} strokeWidth={14} fill="none" opacity={0.35} />
            <path d={arcPath(frac(scale.lo), frac(scale.hi))} stroke={NORMAL} strokeWidth={14} fill="none" opacity={0.35} />
            <path d={arcPath(frac(scale.hi), 1)} stroke={bandColor("high", higherIsBetter)} strokeWidth={14} fill="none" opacity={0.35} />
            <text x={CX - R} y={CY + 12} fontSize={11} fill={AXIS_STROKE} textAnchor="middle">{format(scale.min)}</text>
            <text x={CX + R} y={CY + 12} fontSize={11} fill={AXIS_STROKE} textAnchor="middle">{format(scale.max)}</text>
          </>
        ) : (
          <path d={arcPath(0, 1)} stroke={GRID_STROKE} strokeWidth={14} fill="none" />
        )}
        {scale && target !== undefined && (
          <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke={NEEDLE} strokeWidth={2} strokeDasharray="3 2">
            <title>目標 {target}{unit}</title>
          </line>
        )}
        {scale && value !== null && (
          <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={NEEDLE} strokeWidth={3} strokeLinecap="round" />
        )}
        <circle cx={CX} cy={CY} r={5} fill={NEEDLE} />
      </svg>
      <Text fontSize="2xl" fontWeight="bold" lineHeight="1" color={band ? bandColor(band, higherIsBetter) : "gray.400"}>
        {value === null ? "—" : format(value)}
        <Text as="span" fontSize="sm" color="gray.500" ml={1}>{unit}</Text>
      </Text>
    </Box>
  );
}
