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
    currentGame: CurrentGame;
    isDoubleJeopardy: boolean;
    answered: { [key: string]: number[] };
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

export interface QuestionState {
    questionVisible: boolean;
}

export interface EmptyQuestionState extends QuestionState { }

export interface FamilyFeudQuestionState extends QuestionState {
    revealedAnswers: boolean[];
    wrongGuesses: number;
}

export interface MinuteQuestionState extends QuestionState {
    readyTimer: boolean;
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

export enum GameName {
    BOARD = "board",
    FAMILY_FEUD = "feud",
    MILLIONAIRE = "millionaire",
    MINUTE = "minute",
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
        default:
            return "No Entry for Gam Yet";
    }
}