import React from "react";
import { updateQuestionState } from "../shared/partyGames";
import { teamColor } from "../shared/teamColors";
import {
  ClockState,
  getCurrentQuestion,
  PerformMode,
  PerformQuestionState,
  QuestionProps,
} from "../shared/types";
import CountdownClock from "./CountdownClock";
import NoQuestionAvailable from "./NoQuestionAvailable";

const MODE_INFO: Record<PerformMode, { icon: string; title: string; rule: string }> = {
  act: { icon: "🎭", title: "ACT IT OUT", rule: "No talking, no sounds, no pointing at real objects." },
  draw: { icon: "✏️", title: "DRAW IT", rule: "No letters, no numbers, no talking." },
  describe: { icon: "🗣️", title: "DESCRIBE IT", rule: "Don't say the word or any off-limits word." },
};

// Charades / pictionary / taboo in one game. One player from the team that
// has the turn performs the secret word for their team; the TV shows the mode,
// who's up and the clock, never the word until the host reveals it. The host
// awards the tile if the team gets it.
const ActDrawDescribe: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const prompt = getCurrentQuestion(gameState.gameData.act ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as PerformQuestionState;

  if (!prompt) {
    return <NoQuestionAvailable />;
  }

  const info = MODE_INFO[prompt.mode];
  const teams = gameState.teams;
  const turnIndex = Math.max(0, teams.findIndex((team) => team.id === gameState.whoseTurn));
  const turnTeam = teams[turnIndex];
  const wordRevealed = !!questionState.wordRevealed;

  const setClock = (clock: ClockState) => {
    if (!isAdmin) return;
    sendGameStateToServer(updateQuestionState<PerformQuestionState>(gameState, { clock }));
  };
  const toggleWord = () => {
    if (!isAdmin) return;
    sendGameStateToServer(
      updateQuestionState<PerformQuestionState>(gameState, { wordRevealed: !wordRevealed })
    );
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-3xl font-semibold text-accent sm:text-5xl xl:text-8xl">
        <span aria-hidden="true">{info.icon}</span> {info.title}
      </p>
      <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">{info.rule}</p>

      {turnTeam && (
        <p className="mt-4 text-lg sm:text-2xl xl:text-5xl">
          Up now:{" "}
          <span className={`font-display font-semibold ${teamColor(turnIndex).text}`}>
            {turnTeam.name}
          </span>
        </p>
      )}

      <div className="my-6">
        <CountdownClock clock={questionState.clock} isAdmin={isAdmin} onChange={setClock} />
      </div>

      {/* The secret word: host always, TV only once revealed. */}
      {(isAdmin || wordRevealed) && (
        <div className="mx-auto max-w-3xl rounded-lg border-2 border-accent/50 p-4">
          <p className="text-sm uppercase tracking-widest text-white/60 xl:text-2xl">
            {isAdmin && !wordRevealed ? "Secret word (host only)" : "The word was"}
          </p>
          <p className="font-display text-3xl font-semibold sm:text-5xl xl:text-8xl">
            {prompt.word}
          </p>
          {prompt.mode === "describe" && prompt.taboo && prompt.taboo.length > 0 && (
            <p className="mt-2 text-base text-rose-300 sm:text-xl xl:text-4xl">
              Off-limits: {prompt.taboo.join(" · ")}
            </p>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleWord}
            className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
          >
            {wordRevealed ? "Hide word from TV" : "Show word on TV"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActDrawDescribe;
