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

// Stub routes — return 401 so health probes see "up"
const stubRouter = Router();
stubRouter.all("/{*splat}", (_req, res) => res.status(401).json({ message: "Unauthorized" }));
stubRouter.all("/", (_req, res) => res.status(401).json({ message: "Unauthorized" }));

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

router.use("/v1", v1);

export default router;
