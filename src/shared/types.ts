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
    isDoubleJeopardy: boolean;
    // Which board the host is showing: the four classic games, or the party
    // games. Undefined means classic (states from before this existed).
    boardPage?: BoardPage;
    answered: { [key: string]: number[] };
    doubleJeopardyAnswered: { [key: string]: number[] };
}

export function clampTeamCount(count: number): number {
    return Math.min(Math.max(Math.trunc(count) || MIN_TEAMS, MIN_TEAMS), MAX_TEAMS);
}

const TEAM_NAME_LETTERS = ["A", "B", "C", "D"];

export function createDefaultTeams(count: number): TeamState[] {
    const n = clampTeamCount(count);
    return Array.from({ length: n }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${TEAM_NAME_LETTERS[i]}`,
        score: 0,
    }));
}

export interface CurrentGame {
    gameName: GameName;
    gameTitle: string;
    value: number;
    questionState: QuestionState;
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
    category: string;
    // Shared by every team in turn order; wraps around if a tile runs out.
    words: string[];
    seconds?: number;
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

export interface CharadesQuestionState extends QuestionState {
    clock: ClockState;
    // The team currently acting, or null before the first turn starts.
    activeTeamId: string | null;
    // Position in the tile's word list; every team continues from here.
    wordIndex: number;
    // teamId -> words guessed (null until that team has had a turn).
    scores: Record<string, number | null>;
}

export type BoardPage = "classic" | "party";

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
    const { value } = gameState.currentGame;
    const key = gameState.isDoubleJeopardy ? value / 2 + 1 : value;
    return bank[key];
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