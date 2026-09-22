import yay from "../assets/yay.mp3";
import oof from "../assets/oof.mp3";
import soundtrack1 from "../assets/millionaire/sountrack-1.mp3";
import soundtrack2 from "../assets/millionaire/sountrack-2.mp3";
import soundtrack3 from "../assets/millionaire/sountrack-3.mp3";
import losing1 from "../assets/losing1.mp3";
import losing2 from "../assets/losing2.mp3";
import losing3 from "../assets/losing3.mp3";
import winning1 from "../assets/winning1.wav";
import winning2 from "../assets/winning2.wav";
import winning3 from "../assets/winning3.mp3";
import buzzer from "../assets/buzzer.wav";
import ding from "../assets/yes-ding.mp3";
import feudTheme from "../assets/feudShort.mp3"
import tick from "../assets/tick.wav";
import puzzleDisplay from "../assets/puzzle-display.mp3";

export const millionaireSoundtrackFiles = [soundtrack1, soundtrack2, soundtrack3];
export const sadFiles = [oof, losing1, losing2, losing3];
export const happyFiles = [yay, winning1, winning2, winning3];
export const buzzerAudio = buzzer;
export const dingAudio = ding;  
export const familyFeudTheme = feudTheme;
// Countdown clocks, last 5 seconds (distinct from the answer-reveal ding).
export const tickAudio = tick;
// Guess That Word: when the puzzle first appears on the TV.
export const puzzleDisplayAudio = puzzleDisplay;

export const getRandomAudio = (files: string[]) => {
    return files[Math.floor(Math.random() * files.length)]
}