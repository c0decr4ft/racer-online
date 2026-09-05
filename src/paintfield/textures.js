import * as THREE from "three";

function canvas(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

export function grassTexture() {
  const tex = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#3a6b32";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const h = 4 + Math.random() * 10;
      ctx.strokeStyle = Math.random() > 0.5 ? "#4d8640" : "#2f5829";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - h);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#6a9a4a" : "#2a4a24";
      ctx.fillRect(Math.random() * s, Math.random() * s, 40, 28);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

export function dirtTexture() {
  const tex = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#6b5438";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 50},${70 + Math.random() * 30},${40},0.4)`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 8);
  return tex;
}

export function gravelTexture() {
  const tex = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#b7b2a6";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2200; i++) {
      const g = 140 + Math.random() * 70;
      ctx.fillStyle = `rgb(${g + 8},${g},${g - 14})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 1 + Math.random() * 3, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#9a9488" : "#d2cdc2";
      ctx.fillRect(Math.random() * s, Math.random() * s, 50, 24);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export function concreteTexture() {
  const tex = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#7c7c78";
    ctx.fillRect(0, 0, s, s);
    const tile = 128;
    for (let y = 0; y < s; y += tile) {
      for (let x = 0; x < s; x += tile) {
        const n = 150 + ((x * 3 + y * 7) % 18);
        ctx.fillStyle = `rgb(${n},${n - 1},${n - 5})`;
        ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        for (let i = 0; i < 40; i++) {
          const g = n - 8 + Math.random() * 16;
          ctx.fillStyle = `rgba(${g},${g - 1},${g - 4},0.28)`;
          ctx.fillRect(x + 6 + Math.random() * (tile - 12), y + 6 + Math.random() * (tile - 12), 4, 3);
        }
      }
    }
    ctx.fillStyle = "#6a6a66";
    for (let i = 0; i <= s; i += tile) {
      ctx.fillRect(i, 0, 3, s);
      ctx.fillRect(0, i, s, 3);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 8);
  return tex;
}

export function corrugatedTexture() {
  const tex = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#9aa0a4";
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 10) {
      ctx.fillStyle = x % 20 === 0 ? "#7c8286" : "#b4b9bc";
      ctx.fillRect(x, 0, 6, s);
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#3a2208";
    for (let i = 0; i < 30; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 40, 18);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

export function cautionTexture() {
  const tex = canvas(128, (ctx, s) => {
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#f5c400";
    for (let i = -s; i < s * 2; i += 28) {
      ctx.save();
      ctx.translate(i, 0);
      ctx.transform(1, 0, 0.7, 1, 0, 0);
      ctx.fillRect(0, 0, 14, s);
      ctx.restore();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

export function plywoodTexture() {
  const tex = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#d2ae6a";
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 7) {
      ctx.strokeStyle = `rgba(90,58,18,${0.12 + (x % 21) * 0.008})`;
      ctx.lineWidth = 1 + (x % 14 === 0 ? 1 : 0);
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x * 0.4) * 1.5, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(70,42,12,0.55)";
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, s - 8, s - 8);
    ctx.fillStyle = "rgba(50,30,10,0.45)";
    for (const [x, y] of [
      [14, 14],
      [s - 14, 14],
      [14, s - 14],
      [s - 14, s - 14],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function rustTexture() {
  const tex = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#5a4638";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 80},${40 + Math.random() * 30},${16},0.45)`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function meshFenceTexture() {
  const tex = canvas(128, (ctx, s) => {
    ctx.fillStyle = "rgba(210, 90, 20, 0.55)";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(255, 160, 60, 0.8)";
    ctx.lineWidth = 2;
    const step = 10;
    for (let y = -s; y < s * 2; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + s * 0.35);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 4);
  return tex;
}

export function chainlinkTexture() {
  const tex = canvas(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(200, 210, 200, 0.7)";
    ctx.lineWidth = 3;
    const step = 16;
    for (let y = -s; y < s * 2; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s, y);
      ctx.lineTo(0, y + s);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 6);
  return tex;
}

export function woodTexture() {
  const tex = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#6a4a2a";
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 18) {
      ctx.fillStyle = x % 36 === 0 ? "#5a3c22" : "#7a5632";
      ctx.fillRect(x, 0, 16, s);
    }
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = "#3a2414";
      ctx.fillRect(Math.random() * s, Math.random() * s, 40, 2);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function splatTexture(hex) {
  const color = new THREE.Color(hex);
  return canvas(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const blobs = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < blobs; i++) {
      const x = s / 2 + (Math.random() - 0.5) * 50;
      const y = s / 2 + (Math.random() - 0.5) * 50;
      const r = 10 + Math.random() * 28;
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(${color.r * 255 | 0},${color.g * 255 | 0},${color.b * 255 | 0},0.95)`);
      g.addColorStop(0.55, `rgba(${color.r * 255 | 0},${color.g * 255 | 0},${color.b * 255 | 0},0.75)`);
      g.addColorStop(1, `rgba(${color.r * 255 | 0},${color.g * 255 | 0},${color.b * 255 | 0},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${color.r * 255 | 0},${color.g * 255 | 0},${color.b * 255 | 0},0.85)`;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 18 + Math.random() * 40;
      const x = s / 2 + Math.cos(a) * d;
      const y = s / 2 + Math.sin(a) * d;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = s / 2 + (Math.random() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(x, s / 2 + 8);
      ctx.quadraticCurveTo(x + 4, s / 2 + 30, x - 2, s / 2 + 50 + Math.random() * 20);
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.strokeStyle = `rgba(${color.r * 255 | 0},${color.g * 255 | 0},${color.b * 255 | 0},0.7)`;
      ctx.stroke();
    }
  });
}
