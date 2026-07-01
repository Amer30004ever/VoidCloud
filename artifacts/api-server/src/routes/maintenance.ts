import { Router } from "express";
import { db } from "@workspace/db";
import { maintenanceModeTable } from "@workspace/db";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/maintenance", async (req, res) => {
  try {
    const modes = await db.query.maintenanceModeTable.findMany();
    const mode = modes[0] || { enabled: false, message: "Platform is operational.", estimatedEnd: null, updatedAt: new Date() };
    res.json({ ...mode, updatedAt: mode.updatedAt.toISOString(), estimatedEnd: mode.estimatedEnd?.toISOString() || null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/maintenance", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { enabled, message, estimatedEnd } = req.body;
    const modes = await db.query.maintenanceModeTable.findMany();
    
    if (modes.length === 0) {
      const [mode] = await db.insert(maintenanceModeTable).values({
        enabled, message: message || "Platform is undergoing maintenance.", estimatedEnd: estimatedEnd ? new Date(estimatedEnd) : null,
      }).returning();
      res.json({ ...mode, updatedAt: mode.updatedAt.toISOString(), estimatedEnd: mode.estimatedEnd?.toISOString() || null });
    } else {
      const { eq } = await import("drizzle-orm");
      const [mode] = await db.update(maintenanceModeTable).set({
        enabled, message: message || modes[0].message, estimatedEnd: estimatedEnd ? new Date(estimatedEnd) : null, updatedAt: new Date(),
      }).where(eq(maintenanceModeTable.id, modes[0].id)).returning();
      res.json({ ...mode, updatedAt: mode.updatedAt.toISOString(), estimatedEnd: mode.estimatedEnd?.toISOString() || null });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
