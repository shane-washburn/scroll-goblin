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
      const dispose = mount(target, { gameId: "the-snore-chestra-9b8a6249", buildId: "7215f05d-da97-475c-958d-ba29c746ba23", getAudioBus, isMuted, setMuted, subscribeMuted, trackStat, trackEvent });
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
    <h1 className="text-2xl font-bold">{"The Snore-chestra"}</h1>
    <p className="text-sm">{"A cacophony of distractions (sirens, barking dogs, phone rings) are trying to keep you up! Your only defense is to gently 'snore' them away."}</p>
    {failed && <p role="alert">This game could not start. Please reload the page.</p>}
    <div ref={container} />
  </section>;
}
