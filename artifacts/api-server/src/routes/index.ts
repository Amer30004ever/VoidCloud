import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);

// v1 API routes
const v1 = Router();
v1.use("/auth", authRouter);
v1.use("/users", usersRouter);

// Stub routes — 401 if no token (health probes see "up"), empty data if authenticated
function stubResponse(_req: import("express").Request, res: import("express").Response) {
  const hasToken = !!_req.headers.authorization?.startsWith("Bearer ");
  if (!hasToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  // Return sensible empty shapes for common response types
  const path = _req.path.toLowerCase();
  if (path.includes("usage") || path.includes("metrics") || path.includes("health")) {
    res.json({ data: null, status: "ok" });
  } else {
    res.json([]);
  }
}

const stubRouter = Router();
stubRouter.all("/{*splat}", stubResponse);
stubRouter.all("/", stubResponse);

v1.use("/tenants", stubRouter);
v1.use("/vps", stubRouter);
v1.use("/billing", stubRouter);
v1.use("/crm", stubRouter);
v1.use("/whatsapp", stubRouter);
v1.use("/email", stubRouter);
v1.use("/notifications", stubRouter);
v1.use("/monitoring", stubRouter);
v1.use("/audit", stubRouter);
v1.use("/analytics", stubRouter);
v1.use("/cloud", stubRouter);
v1.use("/deployments", stubRouter);
v1.use("/plans", stubRouter);
v1.use("/images", stubRouter);
v1.use("/backups", stubRouter);
v1.use("/databases", stubRouter);
v1.use("/webhooks", stubRouter);

router.use("/v1", v1);

export default router;
