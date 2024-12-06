import React, { useState } from "react";
import { useParams } from "react-router-dom";
import familyFeudJson from "../data/familyFeud.json";
import { FamilyFeudQuestion, FamilyFeudQuestions } from "../types/common";

const FamilyFeud: React.FC = () => {
  const { value } = useParams<{ value: string }>();

  const allQuestions: FamilyFeudQuestions = familyFeudJson;
  const questionData: FamilyFeudQuestion = allQuestions[value!];

  const [revealedAnswers, setRevealedAnswers] = useState<boolean[]>(
    Array(questionData.answers.length).fill(false)
  );
  const [showQuestion, setShowPrompt] = useState<boolean>(false); // State to control question visibility

  const handleReveal = (index: number) => {
    setRevealedAnswers((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  const handleShowPrompt = () => {
    setShowPrompt(true); // Set the question to be revealed
  };

  return (
    <div className="p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-lg mx-auto">
        {/* Button to reveal the question */}
        {!showQuestion && (
          <button
            onClick={handleShowPrompt}
            className="mb-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reveal Question
          </button>
        )}

        {/* Question text */}
        {showQuestion && (
          <p className="text-lg font-semibold mb-4">{questionData.prompt}</p>
        )}

        <ul className="space-y-4">
          {questionData.answers.map((answer, index) => (
            <li
              key={index}
              className={`p-4 border rounded-lg ${
                revealedAnswers[index] ? "bg-green-100" : "bg-gray-200"
              }`}
              onClick={() => handleReveal(index)}
            >
              {revealedAnswers[index] ? answer : index + 1}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FamilyFeud;
