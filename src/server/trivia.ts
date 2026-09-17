import axios from "axios";
import { Difficulty, MillionaireSubQuestion } from "../shared/types";
import { shuffleArray } from "./datagen";

interface OpenTriviaResponse {
    response_code: number;
    results: OpenTriviaQuestion[];
}

interface OpenTriviaQuestion {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}

const baseFilters = [
    "Entertainment: Japanese Anime & Manga",
    "Entertainment: Video Games",
    "Entertainment: Board Games",
    "Entertainment: Comics",
    "Entertainment: Television",
    "Entertainment: Musicals & Theatres",
    "Entertainment: Books",
    "Sports",
    "Celebrities",
    "Vehicles",
];

const difficultyFilters = {
    [Difficulty.easy]: baseFilters,
    [Difficulty.medium]: [...baseFilters,
        "Entertainment: Film",
        "Entertainment: Music",
    ],
    [Difficulty.hard]: [...baseFilters,
        "Entertainment: Film",
        "Entertainment: Music",
    ],
}

// OpenTDB rate-limits each IP to roughly one request every 5 seconds; querying
// faster returns HTTP 429. Space retries accordingly.
const RETRY_DELAY_MS = 5000;
const MAX_ATTEMPTS = 6;

export async function fetchTriviaQuestions(numQuestions: number, difficulty: Difficulty): Promise<MillionaireSubQuestion[]> {
    const allQuestions: MillionaireSubQuestion[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && allQuestions.length < numQuestions; attempt++) {
        if (attempt > 1) {
            // Back off before retrying so we don't trip the rate limit again.
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
        try {
            const subQuestions = await queryAndFilterApi(difficulty);
            console.log(`got ${subQuestions.length} ${difficulty} questions`);
            allQuestions.push(...subQuestions);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Trivia fetch failed (${difficulty}, attempt ${attempt}/${MAX_ATTEMPTS}): ${message}`);
        }
    }

    if (allQuestions.length < numQuestions) {
        console.warn(`Only fetched ${allQuestions.length}/${numQuestions} ${difficulty} trivia questions; some Millionaire tiles will be empty.`);
    }
    return allQuestions;
};

async function queryAndFilterApi(difficulty: Difficulty): Promise<MillionaireSubQuestion[]> {
    const url = `https://opentdb.com/api.php?amount=50&difficulty=${difficulty}&type=multiple&encode=url3986`;
    console.log(`querying ${url}`)
    let response: OpenTriviaResponse;
    try {
        response = (await axios.get<OpenTriviaResponse>(url)).data;
        if (response.response_code != 0) {
            throw new Error("Failed to fetch trivia questions.");
        }
    } catch (error) {
        console.error("Error fetching trivia questions:", error);
        throw error;
    }

    return response.results
        .filter((triviaQuestion) => !difficultyFilters[difficulty].includes(decodeURIComponent(triviaQuestion.category)))
        .map((triviaQuestion) => {
            // Decode the question and answers
            const question = decodeURIComponent(triviaQuestion.question);
            const category = decodeURIComponent(triviaQuestion.category);
            const correctAnswer = decodeURIComponent(triviaQuestion.correct_answer);
            const incorrectAnswer = triviaQuestion.incorrect_answers.map(decodeURIComponent);

            // Shuffle the answers together
            const allAnswers = [...incorrectAnswer, correctAnswer];
            const shuffledAnswers = shuffleArray(allAnswers);

            return {
                question: question,
                category: category,
                answers: shuffledAnswers,
                correctAnswerIdx: shuffledAnswers.indexOf(correctAnswer),
            };
        });
};