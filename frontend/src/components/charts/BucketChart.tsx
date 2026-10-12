import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Bucket } from "../../data/repository.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  data: Bucket[];
  /** ツールチップに出す系列の名前と単位 */
  name: string;
  unit: string;
}

export function BucketChart({ data, name, unit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="bucket" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} ${unit}`, name]} />
        <Bar dataKey="count" fill="#58a6ff" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
