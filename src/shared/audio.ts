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
// winning4-6: owner-added, from Mixkit (mixkit.co, Mixkit Sound Effects Free
// License): casino bling achievement #2067, completion of a level #2063,
// melodic gold price #2000.
import winning4 from "../assets/winning4.wav";
import winning5 from "../assets/winning5.wav";
import winning6 from "../assets/winning6.wav";
import buzzer from "../assets/buzzer.wav";
import ding from "../assets/yes-ding.mp3";
import feudTheme from "../assets/feudShort.mp3"
import tick from "../assets/tick.wav";
import puzzleDisplay from "../assets/puzzle-display.mp3";
// "Hyper-Ultra-Fanfare", CC0: https://opengameart.org/content/hyper-ultra-fanfare
import winnerFanfare from "../assets/winner-fanfare.mp3";
// Lobby music, all CC0 from OpenGameArt (the .ogg originals converted to
// AAC .m4a so every browser plays them):
//   opengameart.org/content/bouncy-hamster-dancing-menu-music
//   opengameart.org/content/upbeat-chiptune-theme
//   opengameart.org/content/funky-menu-loop
//   opengameart.org/content/funky-disco-beats-to-boogiewoogie-to
//   opengameart.org/content/raspberry-jam
import lobbyBouncyHamster from "../assets/lobby/bouncy-hamster.mp3";
import lobbyUpbeatChiptune from "../assets/lobby/upbeat-chiptune.m4a";
import lobbyFunkyMenuLoop from "../assets/lobby/funky-menu-loop.mp3";
import lobbyFunkyDisco from "../assets/lobby/funky-disco.m4a";
import lobbyRaspberryJam from "../assets/lobby/raspberry-jam.m4a";

export const millionaireSoundtrackFiles = [soundtrack1, soundtrack2, soundtrack3];
export const sadFiles = [oof, losing1, losing2, losing3];
export const happyFiles = [
    yay,
    winning1,
    winning2,
    winning3,
    winning4,
    winning5,
    winning6,
];
export const buzzerAudio = buzzer;
export const dingAudio = ding;  
export const familyFeudTheme = feudTheme;
// Countdown clocks, last 5 seconds (distinct from the answer-reveal ding).
export const tickAudio = tick;
// Guess That Word: when the puzzle first appears on the TV.
export const puzzleDisplayAudio = puzzleDisplay;
// End-of-game screen, when the host ends the game.
export const winnerFanfareAudio = winnerFanfare;
// Played shuffled on the TV's title screen while the host has music on.
export const lobbyMusicFiles = [
    lobbyBouncyHamster,
    lobbyUpbeatChiptune,
    lobbyFunkyMenuLoop,
    lobbyFunkyDisco,
    lobbyRaspberryJam,
];

export const getRandomAudio = (files: string[]) => {
    return files[Math.floor(Math.random() * files.length)]
}