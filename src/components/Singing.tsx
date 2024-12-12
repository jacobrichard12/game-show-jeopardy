import React from "react";
import singingJson from "../data/singing.json";
import {
  EmptyQuestionState,
  QuestionProps,
  SingingQuestion,
  SingingQuestions,
} from "../types/common";

interface SingingProps extends QuestionProps {}

const Singing: React.FC<SingingProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const value = gameState.currentGame.value;

  const allQuestions: SingingQuestions = singingJson;
  let questionData: SingingQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
  }

  const embedLink = questionData.embedLink;
  const songTitle = questionData.songTitle;
  const correctWords = questionData.correctWords;
  const start = questionData.start;
  const end = questionData.end;

  return (
    <div>
      <h1>{songTitle}</h1>
      {isAdmin ? (
        <div>
          <h2>Correct Words:</h2>
          <p>{correctWords}</p>
        </div>
      ) : (
        <iframe
          width="560"
          height="315"
          src={`${embedLink}?start=${start}&end=${end}`}
          title={songTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      )}
    </div>
  );
};

export default Singing;
