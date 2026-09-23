import React, { useEffect, useRef, useState } from "react";
import { dingAudio, getRandomAudio, happyFiles, sadFiles } from "../shared/audio";
import {
  isTeamOrderComplete,
  normalizeTeamOrder,
  placeOrderItem,
  removeOrderItem,
  scoreTeamOrder,
  scrambledOrder,
  updateQuestionState,
} from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import {
  getCurrentQuestion,
  OrderQuestionState,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

const LABELS = "ABCDEFGHIJ".split("");

const ROW_TEXT = "font-display text-lg font-semibold sm:text-2xl xl:text-4xl";
const ROW = `rounded p-2 xl:p-4 ${ROW_TEXT}`;
const HEADING = "mb-2 text-sm uppercase tracking-widest text-white/60 xl:text-2xl";

// The TV shows a scrambled list (labelled A, B, C…) and one team — whoever has
// the turn — works out the right order. The host builds the team's answer in
// numbered slots (drag and drop, or click an item then a slot), which fill in
// live on the TV, then checks it: each slot turns green or red, with a cheer
// or a sad sound on the TV. "Reveal all" then replaces the slots with the
// correct order (a ding on the TV), and the host awards the tile or uses
// "No points".
const PutInOrder: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const puzzle = getCurrentQuestion(gameState.gameData.order ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as OrderQuestionState;
  const revealedCount = questionState.revealedCount ?? 0;
  const checked = !!questionState.checked;
  const checkCount = questionState.checkCount ?? 0;
  const items = puzzle?.items ?? [];
  const teamOrder = normalizeTeamOrder(questionState.teamOrder, items.length);
  const score = scoreTeamOrder(teamOrder, items);

  // Host-only: the item picked for click-to-place, and the one being dragged.
  const [selected, setSelected] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);

  // Ding on the TV when the correct order is revealed.
  const prevRevealed = useRef(revealedCount);
  useEffect(() => {
    const before = prevRevealed.current;
    prevRevealed.current = revealedCount;
    if (!isAdmin && revealedCount > before) playSound(dingAudio);
  }, [isAdmin, revealedCount]);

  // Cheer or sad sound on the TV each time the host checks the answer.
  const prevCheckCount = useRef(checkCount);
  const allCorrect = score.allCorrect;
  useEffect(() => {
    const before = prevCheckCount.current;
    prevCheckCount.current = checkCount;
    if (!isAdmin && checked && checkCount > before) {
      playSound(getRandomAudio(allCorrect ? happyFiles : sadFiles));
    }
  }, [isAdmin, checked, checkCount, allCorrect]);

  if (!puzzle) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const total = items.length;
  // Once revealed, the slots show the correct order instead of the team's
  // answer, and the answer can't be edited or checked until Reset round.
  const allRevealed = revealedCount >= total;
  const shownOrder: (string | null)[] = allRevealed ? items : teamOrder;
  const turnIndex = Math.max(0, teams.findIndex((team) => team.id === gameState.whoseTurn));
  const turnTeam = teams[turnIndex];
  const scrambled = scrambledOrder(items, questionState.seed);
  const labelFor = (item: string) => LABELS[scrambled.indexOf(item)];
  const complete = isTeamOrderComplete(teamOrder);
  const anyPlaced = teamOrder.some((entry) => entry !== null);
  // Every answer slot reserves room for the longest item, so filling one in
  // doesn't resize it.
  const longest = items.reduce((a, b) => (b.length > a.length ? b : a), "");
  const selectedItem = selected && items.includes(selected) ? selected : null;

  const patch = (changes: Partial<OrderQuestionState>) =>
    sendGameStateToServer(updateQuestionState<OrderQuestionState>(gameState, changes));

  // Any edit to the answer clears a previous check so the host can check again.
  const setTeamOrder = (next: (string | null)[]) => patch({ teamOrder: next, checked: false });

  const placeItem = (item: string, slot: number) => {
    if (!isAdmin || allRevealed || !items.includes(item)) return;
    setTeamOrder(placeOrderItem(teamOrder, item, slot));
    setSelected(null);
  };
  const removeItem = (item: string) => {
    if (!isAdmin || allRevealed) return;
    setTeamOrder(removeOrderItem(teamOrder, item));
    setSelected(null);
  };
  const clickPoolItem = (item: string) => {
    setSelected(selectedItem === item ? null : item);
  };
  const clickSlot = (slot: number) => {
    if (selectedItem) {
      placeItem(selectedItem, slot);
    } else {
      setSelected(teamOrder[slot]);
    }
  };

  const onDragStart = (item: string) => (event: React.DragEvent) => {
    dragItem.current = item;
    try {
      event.dataTransfer?.setData("text/plain", item);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    } catch {
      // Some environments don't allow setData; the ref covers it.
    }
  };
  const onDragEnd = () => {
    dragItem.current = null;
  };
  const allowDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  };
  const draggedItem = (event: React.DragEvent): string | null => {
    let item = dragItem.current;
    try {
      item = event.dataTransfer?.getData("text/plain") || item;
    } catch {
      // Fall back to the ref.
    }
    dragItem.current = null;
    return item && items.includes(item) ? item : null;
  };
  const dropOnSlot = (slot: number) => (event: React.DragEvent) => {
    event.preventDefault();
    const item = draggedItem(event);
    if (item) placeItem(item, slot);
  };
  const dropOnPool = (event: React.DragEvent) => {
    event.preventDefault();
    const item = draggedItem(event);
    if (item && teamOrder.includes(item)) removeItem(item);
  };

  const checkAnswer = () => {
    if (isAdmin && complete && !allRevealed) patch({ checked: true, checkCount: checkCount + 1 });
  };
  const clearAnswer = () => {
    if (isAdmin) setTeamOrder([]);
    setSelected(null);
  };
  const revealAll = () => {
    if (isAdmin) patch({ revealedCount: total });
  };
  const resetRound = () => {
    if (!isAdmin) return;
    setSelected(null);
    patch({
      seed: Math.floor(Math.random() * 2147483647),
      revealedCount: 0,
      teamOrder: [],
      checked: false,
    });
  };

  const slotColor = (index: number) => {
    if (allRevealed) return "bg-emerald-700";
    if (checked) return score.slotCorrect[index] ? "bg-emerald-700" : "bg-red-700";
    return "bg-tile";
  };

  // Item text over an invisible copy of the longest item, so every slot is the
  // same size whether empty or filled.
  const slotContent = (item: string | null, index: number) => (
    <span className="inline-grid w-full text-left">
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
        <span className="mr-3">{total}.</span>
        <span className="mr-2">A</span>
        {longest}
      </span>
      <span className="col-start-1 row-start-1">
        <span className="mr-3 text-accent">{index + 1}.</span>
        {item ? (
          <>
            <span className="mr-2 text-white/60">{labelFor(item)}</span>
            {item}
            {checked && !allRevealed && (
              <span className="sr-only">{score.slotCorrect[index] ? " (right)" : " (wrong)"}</span>
            )}
          </>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </span>
    </span>
  );

  const resultText = allRevealed
    ? "The correct order"
    : checked
    ? score.allCorrect
      ? "Correct!"
      : `Not quite: ${score.correctCount} of ${total} in the right place`
    : " ";

  return (
    <div className="rounded-xl bg-ink p-3 text-white sm:p-6">
      <div className="text-center">
        <p className="font-display text-2xl font-semibold sm:text-4xl xl:text-7xl">
          Put these in order
        </p>
        <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">
          {puzzle.prompt}: <span className="text-accent">{puzzle.direction}</span>
        </p>
        {turnTeam && (
          <p className="mt-3 text-lg sm:text-2xl xl:text-5xl">
            Playing:{" "}
            <span className={`font-display font-semibold ${teamColor(turnIndex).text}`}>
              {turnTeam.name}
            </span>
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-lg bg-surface p-3 xl:p-6"
          onDragOver={isAdmin ? allowDrop : undefined}
          onDrop={isAdmin ? dropOnPool : undefined}
        >
          <p className={HEADING}>Scrambled</p>
          <ul className="space-y-2">
            {scrambled.map((item, index) => {
              const placed = shownOrder.includes(item);
              const label = (
                <>
                  <span className="mr-3 text-accent">{LABELS[index]}</span>
                  {item}
                </>
              );
              if (!isAdmin) {
                return (
                  <li key={item} className={`${ROW} bg-tile ${placed ? "opacity-40" : ""}`}>
                    {label}
                  </li>
                );
              }
              const isSelected = selectedItem === item;
              return (
                <li key={item}>
                  <button
                    type="button"
                    draggable
                    onDragStart={onDragStart(item)}
                    onDragEnd={onDragEnd}
                    onClick={() => clickPoolItem(item)}
                    aria-pressed={isSelected}
                    aria-label={`Pick ${item}`}
                    className={`block w-full cursor-grab text-left ${ROW} bg-tile ring-accent ${
                      isSelected ? "ring-4" : ""
                    } ${placed ? "opacity-40" : ""}`}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-lg bg-surface p-3 xl:p-6">
          <p className={HEADING}>
            {allRevealed
              ? "Correct order"
              : turnTeam
              ? `${turnTeam.name}'s answer`
              : "Team's answer"}
          </p>
          <ol className="space-y-2" aria-label="Team's answer">
            {shownOrder.map((item, index) =>
              isAdmin ? (
                <li
                  key={index}
                  className={`flex items-stretch gap-1 rounded ${slotColor(index)}`}
                  onDragOver={allowDrop}
                  onDrop={dropOnSlot(index)}
                >
                  <button
                    type="button"
                    disabled={allRevealed}
                    draggable={!!item && !allRevealed}
                    onDragStart={item && !allRevealed ? onDragStart(item) : undefined}
                    onDragEnd={onDragEnd}
                    onClick={() => clickSlot(index)}
                    aria-label={`Slot ${index + 1}: ${item ?? "empty"}`}
                    className={`min-w-0 flex-1 ${ROW} ring-accent ${
                      item && selectedItem === item ? "ring-4" : ""
                    } ${selectedItem ? "hover:ring-2" : ""}`}
                  >
                    {slotContent(item, index)}
                  </button>
                  <button
                    type="button"
                    onClick={() => item && removeItem(item)}
                    disabled={!item || allRevealed}
                    aria-label={item ? `Remove ${item}` : `Remove from slot ${index + 1}`}
                    className="px-2 text-white/60 hover:text-white disabled:invisible"
                  >
                    ×
                  </button>
                </li>
              ) : (
                <li key={index} className={`${ROW} ${slotColor(index)}`}>
                  {slotContent(item, index)}
                </li>
              )
            )}
          </ol>
        </div>
      </div>

      {/* Always rendered (blank until checked) so the result doesn't push
          anything down when it appears. */}
      <p
        role="status"
        className={`mt-4 text-center font-display text-2xl font-semibold sm:text-3xl xl:text-6xl ${
          allRevealed || score.allCorrect ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {resultText}
      </p>

      {isAdmin && (
        <div className="mt-5 space-y-4 text-center">
          <p className="text-sm text-white/60">
            Drag items into the slots (or click an item, then a slot) to build the team's
            answer. Drag or × to take one back out.
          </p>
          {/* Host only: the answer key, since the TV has no separate column. */}
          <p className="text-sm text-white/70">
            Answer:{" "}
            <span className="font-mono tracking-widest text-accent">
              {items.map((item) => labelFor(item)).join(" ")}
            </span>
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={checkAnswer}
              disabled={!complete || allRevealed}
              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Check answer
            </button>
            <button
              type="button"
              onClick={clearAnswer}
              disabled={!anyPlaced || allRevealed}
              className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Clear answer
            </button>
            <button
              type="button"
              onClick={revealAll}
              disabled={allRevealed}
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              Reveal all
            </button>
            <button
              type="button"
              onClick={resetRound}
              className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              Reset round
            </button>
          </div>
          <p className="text-sm text-white/60">
            Award the tile to the team if they got it right, or use No points.
          </p>
        </div>
      )}
    </div>
  );
};

export default PutInOrder;
