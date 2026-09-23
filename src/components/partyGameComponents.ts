import React from "react";
import { GameName, QuestionProps } from "../shared/types";
import ActDrawDescribe from "./ActDrawDescribe";
import ClosestWins from "./ClosestWins";
import PutInOrder from "./PutInOrder";
import ReverseCharades from "./ReverseCharades";
import ScavengerSprint from "./ScavengerSprint";
import WheelPuzzle from "./WheelPuzzle";

// The party board's games. Each renders both the host panel and the TV from
// the same props (isAdmin decides which), so the host and display wrappers
// share this one lookup.
export const PARTY_GAME_COMPONENTS: Partial<Record<GameName, React.FC<QuestionProps>>> = {
  [GameName.WHEEL]: WheelPuzzle,
  [GameName.ACT]: ActDrawDescribe,
  [GameName.CHARADES]: ReverseCharades,
  [GameName.SCAVENGER]: ScavengerSprint,
  [GameName.CLOSEST]: ClosestWins,
  [GameName.ORDER]: PutInOrder,
};
