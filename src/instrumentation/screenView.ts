import { useEffect } from "react";
import { track } from "./events";

export function useScreenView(screen: string): void {
  useEffect(() => {
    track({ type: "screen_view", screen });
  }, [screen]);
}
