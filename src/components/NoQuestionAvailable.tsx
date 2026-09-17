import React from "react";

// Shown by a mini-game component when its slot has no matching question data
// (e.g. a trivia API call came up short at startup). Shared so the message
// and styling only need to change in one place.
const NoQuestionAvailable: React.FC = () => (
  <div className="p-4 text-center text-2xl text-gray-500 italic">
    No question is available for this tile.
  </div>
);

export default NoQuestionAvailable;
