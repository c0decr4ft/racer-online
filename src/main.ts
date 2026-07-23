import "./style.css";
import { Game } from "./game";
import { GAME_VERSION } from "./version";
import { initVersionSwitcher } from "./versions";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

initVersionSwitcher();

const game = new Game(canvas);
Object.assign(window, { __game: game });
console.info(`[racer] v${GAME_VERSION} ready`);
