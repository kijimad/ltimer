import { useState } from "react";

/** 描画中に Date.now() を呼ぶと再描画ごとに値が変わるので、マウント時に固定する */
export function useMountTime(): number {
  const [now] = useState(() => Date.now());
  return now;
}
