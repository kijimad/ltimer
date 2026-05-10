import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { Box } from "@chakra-ui/react";

mermaid.initialize({ startOnLoad: false, theme: "default" });

let idCounter = 0;

interface Props {
  chart: string;
}

export function Mermaid({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${idCounter++}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    mermaid.render(idRef.current, chart).then(({ svg }) => {
      el.innerHTML = svg;
    });
  }, [chart]);

  return <Box ref={ref} overflowX="auto" />;
}
