import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  data: object[];
  series: { key: string; name: string; color: string }[];
  unit?: string;
  integer?: boolean;
}

export function StackedPeriodChart({ data, series, unit, integer = false }: Props) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="period" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} unit={unit} allowDecimals={!integer} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="stack" fill={s.color} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
