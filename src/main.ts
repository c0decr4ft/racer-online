import "./style.css";
import { Game } from "./game";
import { GAME_VERSION } from "./version";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

const badge = document.getElementById("version-badge");
if (badge) badge.textContent = `v${GAME_VERSION}`;

const game = new Game(canvas);
Object.assign(window, { __game: game });
console.info(`[racer] v${GAME_VERSION} ready`);
