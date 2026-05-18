import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 24;
const ROWS = 20;
const CELL = 26;

type Vec = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const AWS_SERVICES = [
  { name: "S3", color: "#569A31", icon: "🪣" },
  { name: "Lambda", color: "#FF9900", icon: "λ" },
  { name: "EC2", color: "#FF9900", icon: "⚙" },
  { name: "DynamoDB", color: "#4053D6", icon: "⬢" },
  { name: "CloudFront", color: "#8C4FFF", icon: "☁" },
  { name: "SQS", color: "#FF4F8B", icon: "✉" },
  { name: "RDS", color: "#3B48CC", icon: "🛢" },
];

const DIRS: Record<Dir, Vec> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

function randCell(exclude: Vec[]): Vec {
  while (true) {
    const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!exclude.some((e) => e.x === c.x && e.y === c.y)) return c;
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Vec[]>([{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [food, setFood] = useState(() => ({ pos: { x: 14, y: 10 }, service: AWS_SERVICES[0] }));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const dirRef = useRef(dir);
  const queuedRef = useRef<Dir | null>(null);

  useEffect(() => { dirRef.current = dir; }, [dir]);
  useEffect(() => {
    const b = Number(localStorage.getItem("aws-snake-best") || 0);
    setBest(b);
  }, []);

  const reset = useCallback(() => {
    setSnake([{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    queuedRef.current = null;
    setFood({ pos: { x: 14, y: 10 }, service: AWS_SERVICES[0] });
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT", W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      if (e.key === " ") {
        e.preventDefault();
        if (gameOver) reset();
        else setRunning((r) => !r);
        return;
      }
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      if (nd !== OPPOSITE[dirRef.current]) queuedRef.current = nd;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver, reset]);

  // Game loop
  useEffect(() => {
    if (!running || gameOver) return;
    const speed = Math.max(70, 140 - Math.floor(score / 5) * 6);
    const id = setInterval(() => {
      setSnake((prev) => {
        const nextDir = queuedRef.current ?? dirRef.current;
        if (queuedRef.current) { dirRef.current = nextDir; setDir(nextDir); queuedRef.current = null; }
        const d = DIRS[nextDir];
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
            prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          setRunning(false);
          setBest((b) => {
            const nb = Math.max(b, score);
            localStorage.setItem("aws-snake-best", String(nb));
            return nb;
          });
          return prev;
        }

        const ate = head.x === food.pos.x && head.y === food.pos.y;
        const next = ate ? [head, ...prev] : [head, ...prev.slice(0, -1)];
        if (ate) {
          setScore((s) => s + 10);
          setFood({
            pos: randCell(next),
            service: AWS_SERVICES[Math.floor(Math.random() * AWS_SERVICES.length)],
          });
        }
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [running, gameOver, food, score]);

  // Render
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = COLS * CELL, H = ROWS * CELL;

    // background grid
    ctx.fillStyle = "#0f1828";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,153,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
    }

    // food
    const fx = food.pos.x * CELL, fy = food.pos.y * CELL;
    ctx.shadowColor = food.service.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = food.service.color;
    roundRect(ctx, fx + 3, fy + 3, CELL - 6, CELL - 6, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(food.service.icon, fx + CELL / 2, fy + CELL / 2 + 1);

    // snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const x = seg.x * CELL, y = seg.y * CELL;
      const grad = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      grad.addColorStop(0, "#FF9900");
      grad.addColorStop(1, "#FFB84D");
      ctx.fillStyle = grad;
      if (isHead) { ctx.shadowColor = "#FF9900"; ctx.shadowBlur = 16; }
      roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, isHead ? 8 : 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isHead) {
        // eyes based on direction
        ctx.fillStyle = "#0f1828";
        const cx = x + CELL / 2, cy = y + CELL / 2;
        const d = DIRS[dir];
        const ex = d.x * 4, ey = d.y * 4;
        ctx.beginPath(); ctx.arc(cx + ex - 4 * (d.y ? 1 : 0), cy + ey - 4 * (d.x ? 1 : 0), 2.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + ex + 4 * (d.y ? 1 : 0), cy + ey + 4 * (d.x ? 1 : 0), 2.2, 0, 7); ctx.fill();
      }
    });
  }, [snake, food, dir]);

  // Touch swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      const nd: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : (dy > 0 ? "DOWN" : "UP");
      if (nd !== OPPOSITE[dirRef.current]) queuedRef.current = nd;
    };
    const el = canvasRef.current;
    el?.addEventListener("touchstart", ts, { passive: true });
    el?.addEventListener("touchend", te, { passive: true });
    return () => { el?.removeEventListener("touchstart", ts); el?.removeEventListener("touchend", te); };
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 gap-6">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-display uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Powered by the Cloud
        </div>
        <h1 className="mt-3 text-4xl md:text-6xl font-display font-bold">
          <span className="text-primary">AWS</span> Snake
        </h1>
        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          Colete serviços da AWS e escale sua arquitetura serverless. Cuidado para não colidir com sua própria stack.
        </p>
      </header>

      <div className="flex gap-3 md:gap-6 font-display">
        <Stat label="Score" value={score} accent />
        <Stat label="Best" value={best} />
        <Stat label="Length" value={snake.length} />
      </div>

      <div className="relative rounded-xl p-3 bg-card border border-border" style={{ boxShadow: "var(--shadow-glow)" }}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="block rounded-lg max-w-full h-auto touch-none"
          style={{ imageRendering: "pixelated" }}
        />
        {(!running || gameOver) && (
          <div className="absolute inset-3 rounded-lg bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center px-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              {gameOver ? "Service Unavailable" : "Ready to Deploy?"}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {gameOver
                ? `Sua stack caiu com score ${score}. Reinicie a instância e tente novamente.`
                : "Use as setas ou WASD para controlar. Espaço para pausar."}
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-display uppercase tracking-wider font-bold hover:opacity-90 transition"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {gameOver ? "Redeploy" : "Launch"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
        {AWS_SERVICES.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-card"
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <footer className="text-xs text-muted-foreground font-display uppercase tracking-widest">
        ▲ ▼ ◀ ▶ &nbsp;·&nbsp; Space to pause
      </footer>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="px-4 py-2 rounded-lg bg-card border border-border min-w-24 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
