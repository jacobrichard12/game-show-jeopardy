import { BoardLayoutPage } from "./boardLayout";
import { DecorId } from "./decor";
import { ThemeId } from "./themes";

export interface TeamState {
    id: string;
    name: string;
    score: number;
}

// Team count is fixed for the life of a room (chosen at creation) rather
// than editable mid-game, so GameState just holds a plain list rather than
// separately tracking a count.
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;

export interface GameState {
    gameData: GameData;
    started?: boolean;
    teams: TeamState[];
    whoseTurn?: string; // a TeamState.id
    currentGame: CurrentGame;
    showTimer?: boolean;
    // Same host-driven play/pause/restart for the timer clip.
    timerPlaying?: boolean;
    timerRestart?: number;
    // The timer fills the question area (scores stay) instead of the corner
    // box; reset to the corner each time the timer is shown.
    timerFullScreen?: boolean;
    // Bumped each time the host presses "No One Gets Points"; the TV plays a
    // sad sound and animation on each increase (NoPointsFlash).
    noPointsCount?: number;
    // "We'll be right back": the host paused mid-game (IntermissionScreen),
    // e.g. between a morning and an evening session. Resuming picks up
    // exactly where the game was. pauseMessage = the host's line on the TV.
    paused?: boolean;
    pauseMessage?: string;
    // A pack's Reverse Charades side-game page (SideCharades): running
    // totals across as many rounds as the host likes. Its words are
    // gameData.charades[SIDE_CHARADES_KEY]. Missing = not started.
    sideCharades?: SideCharadesState;
    isDoubleJeopardy: boolean;
    // Which board page the host (and so the TV) is showing: a page id from
    // `board` (Standard: "classic" or "party"). Undefined means the first page.
    boardPage?: BoardPage;
    // A custom content pack's one-page board (shared/boardLayout.ts); missing
    // means the Standard board. Layout only: questions stay in gameData.
    board?: BoardLayoutPage[];
    // The content pack's id (file name), so the lobby's Game setup can show
    // the current choice. Missing = Standard.
    packId?: string;
    // A content pack's lobby title screen; missing = the usual one. `decor`
    // = floating symbols on it (and in the start burst); missing = none.
    titleScreen?: { title: string; subtitle?: string; decor?: DecorId };
    // A content pack can switch Double Jeopardy off (single round); the host's
    // toggle is then hidden. Missing = Double Jeopardy available.
    noDoubleJeopardy?: boolean;
    // A pack can keep the join code off the TV (title screen, the in-game
    // corner, the pause screen), so only people the host invites can join.
    // The host page still shows it. Missing = shown.
    hideJoinCode?: boolean;
    // Set by the host from Settings to show the end-of-game standings on the
    // TV; cleared by "Back to board" or a reset. Missing means false.
    gameOver?: boolean;
    // Board colors, chosen at creation (shared/themes.ts). Missing = Original.
    theme?: ThemeId;
    // Host's lobby-music toggle (off unless pressed); the TV plays it only on
    // the title screen, before the game starts.
    lobbyMusic?: boolean;
    // Bumped by the host's Shuffle button: the TV skips to a new random track.
    lobbyMusicShuffle?: number;
    answered: { [key: string]: number[] };
    doubleJeopardyAnswered: { [key: string]: number[] };
}

export function clampTeamCount(count: number): number {
    return Math.min(Math.max(Math.trunc(count) || MIN_TEAMS, MIN_TEAMS), MAX_TEAMS);
}

const TEAM_NAME_LETTERS = ["A", "B", "C", "D"];
export const TEAM_NAME_MAX_LENGTH = 30;

export function defaultTeamName(index: number): string {
    return `Team ${TEAM_NAME_LETTERS[index]}`;
}

// Names come from the create-game form over the socket, so anything that
// isn't a non-blank string falls back to "Team A/B/…".
export function createDefaultTeams(count: number, names?: unknown): TeamState[] {
    const n = clampTeamCount(count);
    const given = Array.isArray(names) ? names : [];
    return Array.from({ length: n }, (_, i) => {
        const raw = given[i];
        const name = typeof raw === "string" ? raw.trim().slice(0, TEAM_NAME_MAX_LENGTH) : "";
        return {
            id: `team-${i + 1}`,
            name: name || defaultTeamName(i),
            score: 0,
        };
    });
}

export interface CurrentGame {
    // The game being played (which screen and question bank).
    gameName: GameName;
    gameTitle: string;
    value: number;
    questionState: QuestionState;
    // The board column the tile belongs to, when a custom pack's tile plays
    // as a different game than its column (e.g. a Scavenger Sprint tile in a
    // "Head to Head" column). Missing = gameName.
    column?: string;
}

// Which board column a question's tile is in: used tiles are tracked per
// column, so a mixed tile marks its own column's tile as used.
export function tileColumn(game: CurrentGame): string {
    return game.column ?? game.gameName;
}

export enum Difficulty {
    easy = "easy",
    medium = "medium",
    hard = "hard",
}

export interface Question { }

export interface QuestionProps {
    isAdmin: boolean;
    gameState: GameState;
    sendGameStateToServer: (updatedGameState: GameState) => void;
}

export interface GameData {
    feud: FamilyFeudQuestions;
    minute: MinuteQuestions;
    millionaire: MillionaireQuestions;
    head: HeadToHeadQuestions;
    // Party games. Optional until they're on the real board and the server
    // builds them (ROADMAP Tier 5); today only the /sandbox page fills them.
    wheel?: WheelPuzzles;
    act?: PerformPrompts;
    scavenger?: ScavengerItems;
    closest?: ClosestQuestions;
    order?: OrderPuzzles;
    charades?: CharadesPrompts;
}

export type FamilyFeudQuestions = Record<string, FamilyFeudQuestion>;
export interface FamilyFeudQuestion extends Question {
    prompt: string;
    answers: FeudAnswer[];
}
export interface FeudAnswer {
    answer: string;
    points: number;
}

export type MinuteQuestions = Record<string, MinuteQuestion>;
export interface MinuteQuestion extends Question {
    link: string;
    title: string;
    materials: string[];
    description: string;
}

export type MillionaireQuestions = Record<string, MillionaireQuestion>;
export interface MillionaireQuestion extends Question {
    questions: MillionaireSubQuestion[]
}
export interface MillionaireSubQuestion {
    question: string;
    category: string;
    answers: string[];
    correctAnswerIdx: number;
}

export type HeadToHeadQuestions = Record<string, HeadToHeadQuestion>;
export interface HeadToHeadQuestion extends Question {
    title: string;
    players: number;
    adminInfo: string;
}

export interface QuestionState {
    promptVisible: boolean;
}

export interface FamilyFeudQuestionState extends QuestionState {
    showFeudPrompt: boolean;
    revealedAnswers: boolean[];
    wrongGuesses: number;
}

// The host drives the display's video: `videoPlaying` is play/pause, and
// bumping `videoRestart` rewinds it to the start.
export interface MinuteQuestionState extends QuestionState {
    videoPlaying?: boolean;
    videoRestart?: number;
}

export interface HeadToHeadQuestionState extends QuestionState {
    showTitle: boolean;
}

export interface MillionaireQuestionState extends QuestionState {
    questionIdx: number;
    revealedAnswers: number;
    answeredQuestionIdx?: number;
    showCorrectAnswer?: boolean;
}

// ---- Party games (ROADMAP Tier 5) -----------------------------------------
// Banks are keyed by board slot like the others; see partyGames.ts for the
// pure helpers and initial-state factories.

export type WheelPuzzles = Record<string, WheelPuzzle>;
export interface WheelPuzzle extends Question {
    category: string;
    phrase: string;
}

export type PerformMode = "act" | "draw" | "describe";
export type PerformPrompts = Record<string, PerformPrompt>;
export interface PerformPrompt extends Question {
    mode: PerformMode;
    word: string;
    // Off-limits words, for describe mode.
    taboo?: string[];
    seconds?: number;
}

export type ScavengerItems = Record<string, ScavengerItem>;
export interface ScavengerItem extends Question {
    item: string;
    seconds?: number;
}

export type ClosestRule = "closest" | "noOver";
export type ClosestQuestions = Record<string, ClosestQuestion>;
export interface ClosestQuestion extends Question {
    prompt: string;
    answer: number;
    unit?: string;
    // "closest" (default) or "noOver" (closest without going over).
    rule?: ClosestRule;
    // Show without thousands separators (years).
    plain?: boolean;
}

export type OrderPuzzles = Record<string, OrderPuzzle>;
export interface OrderPuzzle extends Question {
    prompt: string;
    // What "first" means, e.g. "closest to the Sun first".
    direction: string;
    // The items in their CORRECT order (the display scrambles them).
    items: string[];
}

// A countdown both screens can run without clock skew: state carries the time
// left at the moment it starts/pauses, and each screen counts down locally
// from when it receives that change. `runId` bumps on every start/pause/reset
// so identical consecutive values still register as a change.
export interface ClockState {
    durationMs: number;
    remainingMs: number;
    running: boolean;
    runId: number;
}

export type CharadesPrompts = Record<string, CharadesPrompt>;
export interface CharadesPrompt extends Question {
    // Not shown in the game; the bank uses it to group words.
    category?: string;
    // Shared by every team in turn order; wraps around if a tile runs out.
    words: string[];
    seconds?: number;
    // A pack tile with no words of its own: it plays from the pack's
    // Reverse Charades side-game list, continuing from the same place
    // (GameState.sideCharades.wordIndex), so no word repeats across the two.
    shared?: boolean;
}

export interface WheelQuestionState extends QuestionState {
    guessedLetters: string[];
    solved: boolean;
    // Wrong attempts at solving the whole word (each flashes an X on the TV).
    wrongGuesses: number;
}

export interface PerformQuestionState extends QuestionState {
    clock: ClockState;
    // Host-controlled: show the secret word on the TV (after time's up).
    wordRevealed: boolean;
}

export interface ScavengerQuestionState extends QuestionState {
    clock: ClockState;
    // The item stays hidden on the TV until the host shows it (which also
    // starts the clock).
    itemRevealed: boolean;
}

export interface ClosestQuestionState extends QuestionState {
    // teamId -> locked-in guess (null until locked in).
    guesses: Record<string, number | null>;
    revealed: boolean;
}

export interface OrderQuestionState extends QuestionState {
    // Seeds the shuffle so host and TV show the same scrambled order.
    seed: number;
    revealedCount: number;
    // The team's answer as the host builds it: one entry per position, holding
    // the item placed there or null. May be shorter than the puzzle (it starts
    // as [] before the puzzle is known); read it via normalizeTeamOrder.
    teamOrder: (string | null)[];
    // True once the host checks a complete answer; editing clears it.
    checked: boolean;
    // Bumps on every check so the TV replays a sound even when two checks in a
    // row give the same result.
    checkCount: number;
}

// The Reverse Charades side game: one long word list, teams alternating
// turns for as many rounds as the host likes (timed with Toggle Timer).
export interface SideCharadesState {
    // The team currently acting, or null between turns.
    activeTeamId: string | null;
    // The team that played last, so the next team in line can be suggested.
    lastTeamId: string | null;
    // Position in the shuffled word list; never repeats until it wraps.
    wordIndex: number;
    // teamId -> words guessed, all rounds together.
    totals: Record<string, number>;
    // Words the active team has this turn.
    turnScore: number;
    // Turns started so far (round = turns / teams, rounded up).
    turns: number;
}

// A content pack as /sandbox gets it (server "sandboxPack", admin token
// only): just the pack's own questions plus its layout. The sandbox keeps its
// sample questions for any tile the pack doesn't fill.
export interface SandboxPack {
    id: string;
    name: string;
    gameData: Partial<GameData>;
    board: BoardLayoutPage[];
    titleScreen: GameState["titleScreen"];
    hideJoinCode: boolean;
    noDoubleJeopardy: boolean;
}

// gameData.charades key of the side game's word list.
export const SIDE_CHARADES_KEY = "side";

export interface CharadesQuestionState extends QuestionState {
    clock: ClockState;
    // The team currently acting, or null before the first turn starts.
    activeTeamId: string | null;
    // Position in the tile's word list; every team continues from here.
    wordIndex: number;
    // teamId -> words guessed (null until that team has had a turn).
    scores: Record<string, number | null>;
}

// A board page id (see shared/boardLayout.ts).
export type BoardPage = string;

export enum GameName {
    BOARD = "board",
    FAMILY_FEUD = "feud",
    MILLIONAIRE = "millionaire",
    MINUTE = "minute",
    HEAD_TO_HEAD = "head",
    TIMER = "timer",
    // Party games (sandbox-only until integrated into the board).
    WHEEL = "wheel",
    ACT = "act",
    SCAVENGER = "scavenger",
    CLOSEST = "closest",
    ORDER = "order",
    CHARADES = "charades",
}

/**
 * Resolves the question for the currently-selected board tile from a question
 * bank, accounting for the Double Jeopardy key offset (DJ tiles use double the
 * point value, and the bank stores the DJ twin at `value / 2 + 1`). Returns
 * `undefined` when the tile has no matching entry — callers must guard against
 * this rather than dereferencing the result directly.
 */
export function getCurrentQuestion<T>(
    bank: Record<string, T>,
    gameState: GameState
): T | undefined {
    const { value, gameName, column } = gameState.currentGame;
    const key = gameState.isDoubleJeopardy ? value / 2 + 1 : value;
    // A mixed tile (a pack tile playing as another game) has its own question,
    // stored under its column, so it never shares one with that game's own
    // column (e.g. a Reverse Charades tile in Head to Head and a Reverse
    // Charades column on another page). Falls back to the plain slot.
    if (column && column !== gameName) {
        const own = bank[mixedTileKey(column, key)];
        if (own !== undefined) return own;
    }
    return bank[key];
}

// Bank key of a mixed tile's question: "<column game>:<slot key>".
export function mixedTileKey(column: string, slotKey: number): string {
    return `${column}:${slotKey}`;
}

// A mixed tile (a custom pack's tile playing inside another game's column,
// e.g. Scavenger Sprint in Head to Head) prefixes its revealed name with its
// own game, so the room knows what kind of challenge it is. Tiles in their own
// column are unchanged. Minute keeps the owner's wording.
export function withGamePrefix(gameState: GameState, text: string): string {
    const { gameName, column } = gameState.currentGame;
    if (!column || column === gameName) return text;
    const label = gameName === GameName.MINUTE ? "Minute to win it" : getGameTitle(gameName);
    return `${label}: ${text}`;
}

export function getGameTitle(gameName: GameName): string {
    switch (gameName) {
        case GameName.BOARD:
            return "Board";
        case GameName.FAMILY_FEUD:
            return "Family Feud";
        case GameName.MILLIONAIRE:
            return "Who Wants To Be A Millionaire";
        case GameName.MINUTE:
            return "Minute To Win It";
        case GameName.HEAD_TO_HEAD:
            return "Head To Head";
        case GameName.WHEEL:
            return "Guess That Word";
        case GameName.ACT:
            return "Act, Draw, Describe";
        case GameName.SCAVENGER:
            return "Scavenger Sprint";
        case GameName.CLOSEST:
            return "Closest Wins";
        case GameName.ORDER:
            return "Put It In Order";
        case GameName.CHARADES:
            return "Reverse Charades";
        default:
            return "No Entry for Game Yet";
    }
}