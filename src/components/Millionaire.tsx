import React, { useState } from "react";
import { useParams } from "react-router-dom";

interface Question {
  category: string;
  value: number;
  question: string;
  answer: string;
  gameData: {
    type: string;
    options: string[];
    correctAnswer: string;
  };
}

const Millionaire: React.FC= () => {

  return (
    <div className="max-w-4xl mx-auto">
      Who Wants to be a millionaire test page
    </div>
  );
};

export default Millionaire;
