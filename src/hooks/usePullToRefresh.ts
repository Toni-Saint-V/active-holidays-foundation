import { useEffect, useRef, useState } from "react";

type Options = {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
};

export function usePullToRefresh({ onRefresh, threshold = 80 }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    function onTouchStart(event: TouchEvent) {
      if (!node || node.scrollTop > 0 || isRefreshing) return;
      startY.current = event.touches[0]?.clientY ?? null;
    }
    function onTouchMove(event: TouchEvent) {
      if (startY.current === null) return;
      const currentY = event.touches[0]?.clientY ?? startY.current;
      const delta = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(140, delta * 0.45));
    }
    async function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (pullDistance >= threshold && !isRefreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, threshold, isRefreshing]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    refresh: async () => {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    }
  };
}
