/* ============================================================
   AWS Snake Game — JavaScript
   ============================================================ */

const COLS = 24;
const ROWS = 20;
const CELL = 26;

const AWS_SERVICES = [
  { name: "S3", color: "#569A31", icon: "🪣" },
  { name: "Lambda", color: "#FF9900", icon: "λ" },
  { name: "EC2", color: "#FF9900", icon: "⚙" },
  { name: "DynamoDB", color: "#4053D6", icon: "⬢" },
  { name: "CloudFront", color: "#8C4FFF", icon: "☁" },
  { name: "SQS", color: "#FF4F8B", icon: "✉" },
  { name: "RDS", color: "#3B48CC", icon: "🛢" },
];

const DIRS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// Game state
let snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
let direction = "RIGHT";
let nextDirection = null;
let food = { pos: { x: 14, y: 10 }, service: AWS_SERVICES[0] };
let score = 0;
let best = localStorage.getItem("aws-snake-best") || 0;
let running = false;
let gameOver = false;
let gameLoopId = null;

// DOM elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const lengthEl = document.getElementById("length");

// Initialize
bestEl.textContent = best;
startBtn.addEventListener("click", startGame);

// Keyboard controls
document.addEventListener("keydown", (e) => {
  const map = {
    ArrowUp: "UP",
    ArrowDown: "DOWN",
    ArrowLeft: "LEFT",
    ArrowRight: "RIGHT",
    w: "UP",
    s: "DOWN",
    a: "LEFT",
    d: "RIGHT",
    W: "UP",
    S: "DOWN",
    A: "LEFT",
    D: "RIGHT",
  };

  if (e.key === " ") {
    e.preventDefault();
    if (gameOver) startGame();
    else running = !running;
    return;
  }

  const nd = map[e.key];
  if (!nd) return;
  e.preventDefault();

  if (nd !== OPPOSITE[direction]) {
    nextDirection = nd;
  }
});

// Touch swipe controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

canvas.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

  const nd =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? "RIGHT"
        : "LEFT"
      : dy > 0
        ? "DOWN"
        : "UP";

  if (nd !== OPPOSITE[direction]) {
    nextDirection = nd;
  }
});

// Utility functions
function randCell(exclude) {
  while (true) {
    const c = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!exclude.some((e) => e.x === c.x && e.y === c.y)) return c;
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function startGame() {
  snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
  direction = "RIGHT";
  nextDirection = null;
  food = { pos: { x: 14, y: 10 }, service: AWS_SERVICES[0] };
  score = 0;
  gameOver = false;
  running = true;
  overlay.classList.add("hidden");
  scoreEl.textContent = score;
  lengthEl.textContent = snake.length;
  gameLoop();
}

function gameLoop() {
  if (!running || gameOver) {
    if (gameLoopId) clearInterval(gameLoopId);
    return;
  }

  const speed = Math.max(70, 140 - Math.floor(score / 5) * 6);

  if (gameLoopId) clearInterval(gameLoopId);

  gameLoopId = setInterval(() => {
    // Update direction
    if (nextDirection) {
      direction = nextDirection;
      nextDirection = null;
    }

    // Calculate new head position
    const d = DIRS[direction];
    const head = { x: snake[0].x + d.x, y: snake[0].y + d.y };

    // Check collision with walls
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      endGame();
      return;
    }

    // Check collision with self
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    // Check if ate food
    const ate = head.x === food.pos.x && head.y === food.pos.y;

    // Update snake
    if (ate) {
      snake.unshift(head);
      score += 10;
      scoreEl.textContent = score;
      lengthEl.textContent = snake.length;

      // Generate new food
      food = {
        pos: randCell(snake),
        service: AWS_SERVICES[Math.floor(Math.random() * AWS_SERVICES.length)],
      };
    } else {
      snake.unshift(head);
      snake.pop();
    }

    render();
  }, speed);
}

function endGame() {
  gameOver = true;
  running = false;
  if (gameLoopId) clearInterval(gameLoopId);

  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem("aws-snake-best", String(best));
  }

  overlayTitle.textContent = "Service Unavailable";
  overlayText.textContent = `Sua stack caiu com score ${score}. Reinicie a instância e tente novamente.`;
  startBtn.textContent = "Redeploy";
  overlay.classList.remove("hidden");
}

function render() {
  const W = COLS * CELL;
  const H = ROWS * CELL;

  // Background grid
  ctx.fillStyle = "#0f1828";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,153,0,0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, H);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(W, y * CELL);
    ctx.stroke();
  }

  // Food
  const fx = food.pos.x * CELL;
  const fy = food.pos.y * CELL;
  ctx.shadowColor = food.service.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = food.service.color;
  roundRect(fx + 3, fy + 3, CELL - 6, CELL - 6, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(food.service.icon, fx + CELL / 2, fy + CELL / 2 + 1);

  // Snake
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const x = seg.x * CELL;
    const y = seg.y * CELL;

    const grad = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
    grad.addColorStop(0, "#FF9900");
    grad.addColorStop(1, "#FFB84D");
    ctx.fillStyle = grad;

    if (isHead) {
      ctx.shadowColor = "#FF9900";
      ctx.shadowBlur = 16;
    }

    roundRect(x + 2, y + 2, CELL - 4, CELL - 4, isHead ? 8 : 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes on head
    if (isHead) {
      ctx.fillStyle = "#0f1828";
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;
      const d = DIRS[direction];
      const ex = d.x * 4;
      const ey = d.y * 4;

      ctx.beginPath();
      ctx.arc(cx + ex - 4 * (d.y ? 1 : 0), cy + ey - 4 * (d.x ? 1 : 0), 2.2, 0, 7);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + ex + 4 * (d.y ? 1 : 0), cy + ey + 4 * (d.x ? 1 : 0), 2.2, 0, 7);
      ctx.fill();
    }
  });
}

// Initial render
render();
