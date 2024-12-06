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

const Millionaire: React.FC = () => {
  const { category, value } = useParams<{ category: string; value: string }>();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      Who Wants to be a millionaire test page
    </div>
  );
};

export default Millionaire;
