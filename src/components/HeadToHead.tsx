import React, { useEffect, useRef } from "react";
import { revealHitAudio } from "../shared/audio";
import { playSound } from "../shared/sound";
import {
  getCurrentQuestion,
  HeadToHeadQuestionState,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

interface HeadToHeadProps extends QuestionProps {}

const HeadToHead: React.FC<HeadToHeadProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const questionData = getCurrentQuestion(gameState.gameData.head, gameState);

  const questionState = gameState.currentGame
    .questionState as HeadToHeadQuestionState;

  // Orchestra hit on the TV when the host shows the challenge (same as
  // Scavenger Sprint's reveal). The ref starts at the current value, so a TV
  // joining after the reveal stays quiet.
  const titleShown = !!questionState.showTitle;
  const wasShown = useRef(titleShown);
  useEffect(() => {
    if (!isAdmin && titleShown && !wasShown.current) playSound(revealHitAudio);
    wasShown.current = titleShown;
  }, [isAdmin, titleShown]);

  if (!questionData) {
    return <NoQuestionAvailable />;
  }

  // Function to convert \n to <br />
  const formatAdminInfo = (adminInfo: string) => {
    return adminInfo.split("\n").map((str, index) => (
      <React.Fragment key={index}>
        {str}
        <br />
      </React.Fragment>
    ));
  };

  const handleShowTitle = () => {
    if (!isAdmin) return; // Only admin can change the readyTimer
    if (questionState.showTitle) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as HeadToHeadQuestionState;

    updatedQuestionState.showTitle = true;
    sendGameStateToServer(updatedGameState); // Send the updated game state to the server
  };

  return (
    <div className="minute-container">
      {/* Title */}
      {!isAdmin && questionState.promptVisible && (
        <h1 className="text-2xl md:text-3xl xl:text-5xl font-bold mb-4 text-center">
          Players Per Team: {questionData.players}
        </h1>
      )}

      {/* The title always takes its space (invisible on the TV, faint for the
          host until shown), so showing it doesn't move anything; the host
          sees the rules from the start. */}
      <h1
        className={`text-3xl sm:text-5xl md:text-7xl xl:text-9xl font-bold mb-4 text-center ${
          questionState.showTitle ? "" : isAdmin ? "opacity-40" : "invisible"
        }`}
        aria-hidden={!questionState.showTitle && !isAdmin}
      >
        {questionData.title}
      </h1>

      {isAdmin && (
        <h2 className="text-2xl font-bold mb-4 text-center">
          {/* Render adminInfo with newlines */}
          {formatAdminInfo(questionData.adminInfo)}
        </h2>
      )}

      {/* Button to trigger readyTimer */}
      {isAdmin && (
        <div className="text-center mt-4">
          <button
            onClick={handleShowTitle}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Show Title
          </button>
        </div>
      )}
    </div>
  );
};

export default HeadToHead;
