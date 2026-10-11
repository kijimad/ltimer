export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** 移動先の月に同じ日がなければ月末に丸める */
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return localDate(target);
}

export function minutesBetween(from: string, to: string): number {
  return (new Date(to.replace(" ", "T")).getTime() - new Date(from.replace(" ", "T")).getTime()) / 60000;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
}

/** 集計の「今日」は閲覧時刻ではなくデータ生成時点とする。生成後のデータは存在しないため */
export function asOfDate(generatedAt: string): string {
  return localDate(new Date(generatedAt));
}

export function localDateTime(instant: string): string {
  const d = new Date(instant);
  return `${localDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatGeneratedAt(generatedAt: string): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${localDateTime(generatedAt)} (${zone})`;
}
