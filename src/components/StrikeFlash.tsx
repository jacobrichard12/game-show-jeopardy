import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from "react";
import { buzzerAudio } from "../shared/audio";
import { playSound } from "../shared/sound";

interface StrikeFlashProps {
  // Total wrong guesses so far; each increase flashes the X once.
  count: number;
  isAdmin: boolean;
}

// The full-screen red X + buzzer from Family Feud, for other games' wrong
// guesses. TV side only, triggered by the count going up in state.
const StrikeFlash: React.FC<StrikeFlashProps> = ({ count, isAdmin }) => {
  const [showing, setShowing] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (isAdmin || count <= prev) return;
    playSound(buzzerAudio);
    setShowing(true);
    const timer = setTimeout(() => setShowing(false), 1300);
    return () => clearTimeout(timer);
  }, [isAdmin, count]);

  if (!showing) return null;
  return (
    <div
      role="img"
      aria-label="Wrong"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-strike"
    >
      <FontAwesomeIcon
        icon={faTimesCircle}
        className="text-red-600 drop-shadow-2xl"
        style={{ fontSize: "min(70vh, 70vw)" }}
      />
    </div>
  );
};

export default StrikeFlash;
