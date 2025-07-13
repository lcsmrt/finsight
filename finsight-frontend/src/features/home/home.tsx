import { useEffect } from "react";

export const Home = () => {
  useEffect(() => {
    const happyCatAudio = new Audio("/assets/happy-cat-1h.mp3");

    happyCatAudio.play();

    return () => {
      happyCatAudio.pause();
      happyCatAudio.currentTime = 0;
    };
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <img
        src="/assets/happy-cat-happy-happy-happy.gif"
        alt="happy happy happy"
        className="w-60"
      />
      <h1 className="text-foreground text-xl font-bold">
        happy happy happy!!!
      </h1>
    </div>
  );
};
