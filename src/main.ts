import "./style.css";
import { initDevDashboard } from "./devDashboard";
import { initFeedbackCompose } from "./feedbackCompose";
import { Game } from "./game";
import { startPresenceHeartbeat } from "./net/presence";
import { GAME_VERSION } from "./version";
import { initVersionSwitcher } from "./versions";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

initVersionSwitcher();
initDevDashboard();
initFeedbackCompose();
startPresenceHeartbeat();

const game = new Game(canvas);
Object.assign(window, { __game: game });
console.info(`[racer] v${GAME_VERSION} ready`);
