import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import api from "@/lib/api";

export function VpsTerminal({ deploymentId }: { deploymentId: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
      fontSize: 13,
      theme: { background: "#0b1020", foreground: "#e5f2ff", cursor: "#22d3ee" },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;

    const base = (api.defaults?.baseURL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    const token = typeof window !== "undefined" ? localStorage.getItem("amer_token") : null;
    const socket = io(`${base}/vps-terminal`, {
      transports: ["websocket"],
      auth: { token, deploymentId },
      query: { token, deploymentId },
    });
    sockRef.current = socket;

    socket.on("connect", () => {
      term.writeln("\x1b[36mconnecting to VPS…\x1b[0m");
      socket.emit("resize", { cols: term.cols, rows: term.rows });
    });
    socket.on("output", (data: string) => term.write(data));
    socket.on("disconnect", () => term.writeln("\r\n\x1b[31m[disconnected]\x1b[0m"));
    socket.on("connect_error", (e) => term.writeln(`\r\n\x1b[31m${e.message}\x1b[0m`));

    const disposeData = term.onData((d) => socket.emit("input", d));
    const disposeResize = term.onResize(({ cols, rows }) => socket.emit("resize", { cols, rows }));

    const onWinResize = () => {
      try { fit.fit(); } catch { /* ignore */ }
    };
    window.addEventListener("resize", onWinResize);

    return () => {
      window.removeEventListener("resize", onWinResize);
      disposeData.dispose();
      disposeResize.dispose();
      socket.disconnect();
      term.dispose();
    };
  }, [deploymentId]);

  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1020] p-2">
      <div ref={ref} style={{ height: 420, width: "100%" }} />
      <p className="mt-2 text-xs text-white/40">
        Sessions auto-disconnect after 15 minutes idle. All commands are logged for security audit.
      </p>
    </div>
  );
}
