export interface Questions {
    "100": Question;
    "200": Question;
    "300": Question;
    "400": Question;
    "500": Question;
}

export interface Question { }

export type FamilyFeudQuestions = Record<string, FamilyFeudQuestion>;

export interface FamilyFeudQuestion extends Question {
    prompt: string,
    answers: string[],
}

export enum GameName {
    BOARD = "board",
    FAMILY_FEUD = "feud",
    MILLIONAIRE = "millionaire",
}