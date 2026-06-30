import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const WORK = 25 * 60;
const BREAK = 5 * 60;

export default function PomodoroPage() {
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [count, setCount] = useState(0);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          if (mode === "work") {
            setCount((c) => c + 1);
            setMode("break");
            return BREAK;
          }
          setMode("work");
          return WORK;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, mode]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <AppLayout>
      <div className="mx-auto max-w-md space-y-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold"><Timer className="h-6 w-6 text-primary" /> Pomodoro</h1>
        <div className="rounded-2xl border border-border bg-card p-12">
          <div className={`text-xs uppercase tracking-widest ${mode === "work" ? "text-primary" : "text-green-500"}`}>{mode}</div>
          <div className="my-6 font-mono text-7xl font-bold tabular-nums text-foreground">{mm}:{ss}</div>
          <div className="flex justify-center gap-3">
            <button onClick={() => setRunning((r) => !r)} className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90">
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => { setRunning(false); setSeconds(mode === "work" ? WORK : BREAK); }} className="rounded-lg border border-border px-6 py-3 hover:bg-muted">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">Completed today: <span className="font-semibold text-foreground">{count}</span></div>
        </div>
      </div>
    </AppLayout>
  );
}
