import csvParser from "csv-parser";
import { createReadStream } from "fs";
import { Difficulty, FamilyFeudQuestion, FeudAnswer } from "../shared/types";
import { shuffleArray } from "./datagen";

export interface FeudLibrary {
    [Difficulty.easy]: FamilyFeudQuestion[];
    [Difficulty.medium]: FamilyFeudQuestion[];
    [Difficulty.hard]: FamilyFeudQuestion[];
}

export async function initFeudLibrary(): Promise<FeudLibrary> {
    let fourQuestions = shuffleArray(await getQuestionsFromCsv(`./src/data/feud4.csv`));
    let fiveQuestions = shuffleArray(await getQuestionsFromCsv(`./src/data/feud5.csv`));
    let sixQuestions = shuffleArray(await getQuestionsFromCsv(`./src/data/feud6.csv`));
    let sevenQuestions = shuffleArray(await getQuestionsFromCsv(`./src/data/feud7.csv`));

    return {
        [Difficulty.easy]: fourQuestions,
        [Difficulty.medium]: fiveQuestions.concat(sixQuestions),
        [Difficulty.hard]: sevenQuestions,
    };
}

export function getQuestionsFromCsv(filePath: string): Promise<FamilyFeudQuestion[]> {
    return new Promise((resolve, reject) => {
        const questions: FamilyFeudQuestion[] = [];

        createReadStream(filePath)
            .pipe(csvParser({
                headers: false,
            }))
            .on('data', (rowObj) => {
                const row: string[] = Object.values(rowObj);
                const prompt = row[0];

                const answers: FeudAnswer[] = [];
                for (let i = 1; i < row.length; i += 2) {
                    const answer = row[i];
                    const points = parseInt(row[i + 1], 10);
                    if (answer && !isNaN(points)) {
                        answers.push({ answer, points });
                    }
                }

                const question: FamilyFeudQuestion = { prompt, answers };
                // Validate the question before adding to the list
                if (validateFeudQuestion(question)) {
                    questions.push(question);
                } else {
                    console.error(`Invalid question skipped: ${prompt}`);
                }
            })
            .on('end', () => {
                console.log('CSV Parsing Complete');
                resolve(questions); // Resolve the promise with the parsed data
            })
            .on('error', (error) => {
                reject(error); // Reject if there is an error
            });

    });
}

/**
 * Validate the data of each FamilyFeudQuestion
 */
function validateFeudQuestion(question: FamilyFeudQuestion): boolean {
    // Check if prompt is valid
    if (!question.prompt || question.prompt.trim() === "") {
        console.error("Invalid prompt: ", question.prompt);
        return false;
    }

    // Check if each answer is valid
    if (!Array.isArray(question.answers) || question.answers.length === 0) {
        console.error("No answers found for question:", question.prompt);
        return false;
    }

    for (const answer of question.answers) {
        if (!answer.answer || typeof answer.answer !== "string" || answer.answer.trim() === "") {
            console.error("Invalid answer: ", answer.answer);
            return false;
        }
        if (isNaN(answer.points) || answer.points <= 0) {
            console.error(`Invalid points for answer "${answer.answer}": ${answer.points}`);
            return false;
        }
    }

    return true;
}
