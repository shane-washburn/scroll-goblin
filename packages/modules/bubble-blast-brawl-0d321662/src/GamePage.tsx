import { useEffect, useRef, useState } from "react";
import { getAudioBus, isMuted, setMuted, subscribeMuted, trackStat, trackEvent } from "@scroll-goblin/ui";
import { mount } from "./game-payload.js";

export default function GamePage() {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    try {
      const dispose = mount(target, { gameId: "bubble-blast-brawl-0d321662", buildId: "f02a3854-2641-4607-aa94-318b86e3d122", getAudioBus, isMuted, setMuted, subscribeMuted, trackStat, trackEvent });
      return () => {
        try { dispose(); } finally { target.replaceChildren(); }
      };
    } catch (error) {
      console.error("Arcade game failed to mount", error);
      target.replaceChildren();
      setFailed(true);
    }
  }, []);
  return <section className="mx-auto flex w-full max-w-md flex-col gap-3 px-3 py-4">
    <h1 className="text-2xl font-bold">{"Bubble Blast Brawl"}</h1>
    <p className="text-sm">{"Inflate and pop bubbles to trap and defeat your bubbly bot rival in a bouncy, chaotic arena!"}</p>
    {failed && <p role="alert">This game could not start. Please reload the page.</p>}
    <div ref={container} />
  </section>;
}
