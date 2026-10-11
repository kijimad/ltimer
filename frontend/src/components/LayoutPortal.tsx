import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayoutSlots, type LayoutSlots } from "../hooks/useLayoutSlots.ts";

export function LayoutPortal({ to, children }: { to: keyof LayoutSlots; children: ReactNode }) {
  const slot = useLayoutSlots()[to];
  return slot ? createPortal(children, slot) : null;
}
