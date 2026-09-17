import { defineRailway, github, preserve, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "game-show-jeopardy";

export default defineRailway(() => {
  const game_show_jeopardy = service("game-show-jeopardy", {
    source: github("jacobrichard12/game-show-jeopardy", { branch: "mainline" }),
    build: "npm install && npm run build",
    start: "npm run server-build",
    // Values are set once via `railway variable set` and preserved here
    // rather than committed to source — ADMIN_TOKEN is a secret, and
    // CLIENT_ORIGIN is a deployment-specific URL, not project config.
    variables: {
      ADMIN_TOKEN: preserve(),
      CLIENT_ORIGIN: preserve(),
    },
  });
  return project("game-show-jeopardy", {
    resources: [game_show_jeopardy],
  });
});
