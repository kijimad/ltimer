import { createContext, useContext } from "react";

/** ページのデータに依存する共通部品を、ページからナビゲーションバーやフッターへ描画するための要素 */
export interface LayoutSlots {
  nav: HTMLElement | null;
  footer: HTMLElement | null;
}

export const LayoutSlotsContext = createContext<LayoutSlots>({ nav: null, footer: null });

export function useLayoutSlots(): LayoutSlots {
  return useContext(LayoutSlotsContext);
}
