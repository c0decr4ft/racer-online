import "./style.css";
import { Game } from "./game";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

const game = new Game(canvas);
Object.assign(window, { __game: game });
console.info("[racer] ready");
