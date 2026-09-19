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
    isDoubleJeopardy: boolean;
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

export interface MinuteQuestionState extends QuestionState {}

export interface HeadToHeadQuestionState extends QuestionState {
    showTitle: boolean;
}

export interface MillionaireQuestionState extends QuestionState {
    questionIdx: number;
    revealedAnswers: number;
    answeredQuestionIdx?: number;
    showCorrectAnswer?: boolean;
}

export enum GameName {
    BOARD = "board",
    FAMILY_FEUD = "feud",
    MILLIONAIRE = "millionaire",
    MINUTE = "minute",
    HEAD_TO_HEAD = "head",
    TIMER = "timer",
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
        default:
            return "No Entry for Game Yet";
    }
}