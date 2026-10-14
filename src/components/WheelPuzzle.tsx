import React, { useEffect, useRef } from "react";
import { BUZZER_LEVEL, buzzerAudio, dingAudio, getRandomAudio, happyFiles, puzzleDisplayAudio } from "../shared/audio";
import {
  ALPHABET,
  countRevealedLetters,
  isPhraseComplete,
  nextTeamId,
  phraseHasLetter,
  updateQuestionState,
  wheelWords,
} from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import {
  getCurrentQuestion,
  QuestionProps,
  WheelQuestionState,
} from "../shared/types";
import { isVowel, vowelsLocked } from "../shared/wheelRules";
import NoQuestionAvailable from "./NoQuestionAvailable";
import StrikeFlash from "./StrikeFlash";

// "Guess That Word": a hangman-style phrase board. Teams take turns calling
// letters; the host taps them. A hit reveals every copy of the letter and the
// team keeps the turn; a miss passes the turn. A wrong attempt at the whole
// answer flashes a Feud-style X and passes the turn. When the phrase is solved
// (or the host reveals it) the host awards the tile with the points buttons.
// No two vowels in a row: after a correct vowel the other vowels grey out
// until a consonant is called.
const WheelPuzzle: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const puzzle = getCurrentQuestion(gameState.gameData.wheel ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as WheelQuestionState;
  const guessed = questionState.guessedLetters ?? [];
  const solved = !!questionState.solved;
  const wrongGuesses = questionState.wrongGuesses ?? 0;
  const phrase = puzzle?.phrase ?? "";
  const revealedLetters = countRevealedLetters(phrase, guessed);
  const vowelLock = !solved && vowelsLocked(phrase, guessed);

  // Sting when the puzzle first appears on the TV (this component mounts on
  // the TV when the host reveals the question). The ref keeps StrictMode's
  // double mount in dev, or a TV reload mid-puzzle, from replaying it.
  const displayPlayed = useRef(false);
  useEffect(() => {
    if (isAdmin || displayPlayed.current) return;
    displayPlayed.current = true;
    if (guessed.length === 0 && !solved) playSound(puzzleDisplayAudio);
    // Mount only: this is about the puzzle appearing, not later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ding on a hit, buzzer on a miss, a cheer when the word is solved or
  // revealed: detected from state changes so it plays on the TV, not from the
  // host's click.
  const prev = useRef({ guessed: guessed.length, revealed: revealedLetters, solved });
  useEffect(() => {
    const before = prev.current;
    prev.current = { guessed: guessed.length, revealed: revealedLetters, solved };
    if (isAdmin) return;
    if (solved && !before.solved) {
      playSound(getRandomAudio(happyFiles));
      return;
    }
    if (guessed.length <= before.guessed) return;
    if (revealedLetters > before.revealed) playSound(dingAudio);
    else playSound(buzzerAudio, BUZZER_LEVEL);
  }, [isAdmin, guessed.length, revealedLetters, solved]);

  if (!puzzle) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const turnId = gameState.whoseTurn ?? teams[0].id;
  const turnIndex = Math.max(0, teams.findIndex((team) => team.id === turnId));
  const turnTeam = teams[turnIndex];

  const guessLetter = (letter: string) => {
    if (!isAdmin || solved || guessed.includes(letter)) return;
    if (vowelLock && isVowel(letter)) return;
    const nextGuessed = [...guessed, letter];
    const complete = isPhraseComplete(phrase, nextGuessed);
    const hit = phraseHasLetter(phrase, letter);
    const updated = updateQuestionState<WheelQuestionState>(gameState, {
      guessedLetters: nextGuessed,
      solved: complete,
    });
    // A miss passes the turn; a hit (or finishing the puzzle) keeps it.
    sendGameStateToServer(
      hit || complete ? updated : { ...updated, whoseTurn: nextTeamId(teams, turnId) }
    );
  };

  const passTurn = () => {
    if (!isAdmin) return;
    sendGameStateToServer({ ...gameState, whoseTurn: nextTeamId(teams, turnId) });
  };

  const wrongGuess = () => {
    if (!isAdmin || solved) return;
    sendGameStateToServer({
      ...updateQuestionState<WheelQuestionState>(gameState, { wrongGuesses: wrongGuesses + 1 }),
      whoseTurn: nextTeamId(teams, turnId),
    });
  };

  const revealPuzzle = () => {
    if (!isAdmin) return;
    sendGameStateToServer(updateQuestionState<WheelQuestionState>(gameState, { solved: true }));
  };

  const words = wheelWords(phrase, guessed, solved);

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <StrikeFlash count={wrongGuesses} isAdmin={isAdmin} />
      <p className="mb-4 font-display text-lg font-semibold uppercase tracking-widest text-accent sm:text-2xl xl:text-5xl">
        {puzzle.category}
      </p>

      {/* Gaps between words are about one and a half tiles wide, so word
          breaks read clearly from across the room. */}
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 sm:gap-x-16 xl:gap-x-28 xl:gap-y-6">
        {words.map((word, wordIndex) => (
          <div key={wordIndex} className="flex gap-1 sm:gap-2">
            {word.map((tile, tileIndex) =>
              tile.isLetter ? (
                <div
                  key={tileIndex}
                  className={`flex h-10 w-8 items-center justify-center rounded font-display text-2xl font-semibold sm:h-16 sm:w-12 sm:text-4xl xl:h-28 xl:w-20 xl:text-7xl ${
                    tile.show ? "bg-white text-ink" : "bg-tile"
                  }`}
                >
                  {tile.show ? (
                    tile.char
                  ) : isAdmin ? (
                    // The host can see the answer, faintly, on unrevealed tiles.
                    <span className="text-white/30">{tile.char}</span>
                  ) : null}
                </div>
              ) : (
                <div
                  key={tileIndex}
                  className="self-center font-display text-2xl text-white sm:text-4xl xl:text-7xl"
                >
                  {tile.char}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {!solved && turnTeam && (
        <p className="mt-5 text-lg sm:text-2xl xl:text-5xl">
          Calling letters:{" "}
          <span className={`font-display font-semibold ${teamColor(turnIndex).text}`}>
            {turnTeam.name}
          </span>
        </p>
      )}
      {solved && (
        <p className="mt-5 font-display text-2xl font-semibold text-emerald-300 sm:text-4xl xl:text-6xl">
          Solved!
        </p>
      )}

      <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-1 sm:gap-2">
        {ALPHABET.map((letter) => {
          const used = guessed.includes(letter);
          const hit = used && phraseHasLetter(phrase, letter);
          const locked = !used && vowelLock && isVowel(letter);
          return (
            <button
              key={letter}
              type="button"
              onClick={() => guessLetter(letter)}
              disabled={!isAdmin || used || solved || locked}
              aria-label={`Guess ${letter}`}
              className={`h-9 w-9 rounded font-display text-lg font-semibold sm:h-12 sm:w-12 sm:text-2xl xl:h-16 xl:w-16 xl:text-4xl ${
                used
                  ? hit
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-900/70 text-white/40 line-through"
                  : locked
                  ? "bg-tile/40 text-white/25"
                  : isAdmin && !solved
                  ? "bg-tile text-accent hover:brightness-125"
                  : "bg-tile text-accent"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Always rendered (invisible when off) so the panel doesn't reflow. */}
      <p
        aria-hidden={!vowelLock}
        className={`mt-3 text-sm text-white/60 sm:text-base xl:text-3xl ${
          vowelLock ? "" : "invisible"
        }`}
      >
        {isAdmin ? "Vowels locked until a consonant is called" : "Next letter must be a consonant"}
      </p>

      {isAdmin && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={passTurn}
            disabled={solved}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Pass turn
          </button>
          <button
            type="button"
            onClick={wrongGuess}
            disabled={solved}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
          >
            ✗ Wrong guess
          </button>
          <button
            type="button"
            onClick={revealPuzzle}
            disabled={solved}
            className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            Reveal puzzle
          </button>
        </div>
      )}
    </div>
  );
};

export default WheelPuzzle;
