export enum Team {
    TeamA = "TeamA",
    TeamB = "TeamB",
}

export interface GameState {
    [Team.TeamA]: {
        name: string;
        score: number;
    };
    [Team.TeamB]: {
        name: string;
        score: number;
    };
    whoseTurn?: Team;
    currentGame: CurrentGame;
    isDoubleJeopardy: boolean;
    answered: { [key: string]: number[] };
    doubleJeopardyAnswered: { [key: string]: number[] };
}

export interface CurrentGame {
    gameName: GameName;
    gameTitle: string;
    value: number;
    questionState: QuestionState;
}

export interface Questions {
    "100": Question;
    "200": Question;
    "300": Question;
    "400": Question;
    "500": Question;
    "101": Question;
    "201": Question;
    "301": Question;
    "401": Question;
    "501": Question;
}

export interface Question { }

export interface QuestionProps {
    isAdmin: boolean;
    gameState: GameState;
    sendGameStateToServer: (updatedGameState: GameState) => void;
}

export type FamilyFeudQuestions = Record<string, FamilyFeudQuestion>;
export interface FamilyFeudQuestion extends Question {
    prompt: string;
    answers: string[];
}

export type MinuteQuestions = Record<string, MinuteQuestion>;
export interface MinuteQuestion extends Question {
    link: string;
    title: string;
}

export type HeadToHeadQuestions = Record<string, HeadToHeadQuestion>;
export interface HeadToHeadQuestion extends Question {
    title: string;
    players: number;
    adminInfo: string;
}

export type MillionaireQuestions = Record<string, MillionaireQuestion>;
export interface MillionaireQuestion extends Question {
    questions: MillionaireSubQuestion[]
}
export interface MillionaireSubQuestion {
    question: string;
    answers: string[];
    correctAnswerIdx: number;
}

export interface QuestionState {
    promptVisible: boolean;
}

export interface EmptyQuestionState extends QuestionState { }

export interface FamilyFeudQuestionState extends QuestionState {
    showFeudPrompt: boolean;
    revealedAnswers: boolean[];
    wrongGuesses: number;
}

export interface MinuteQuestionState extends QuestionState {
    readyTimer: boolean;
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

export enum GameName {
    BOARD = "board",
    FAMILY_FEUD = "feud",
    MILLIONAIRE = "millionaire",
    MINUTE = "minute",
    HEAD_TO_HEAD = "head",
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
            return "No Entry for Gam Yet";
    }
}