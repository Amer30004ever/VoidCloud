import { Router } from "express";
import { db } from "@workspace/db";
import { plansTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/plans", async (req, res) => {
  try {
    const plans = await db.query.plansTable.findMany();
    const subs = await db.query.subscriptionsTable.findMany();
    res.json(plans.map(p => ({
      ...p,
      price: parseFloat(p.price),
      features: Array.isArray(p.features) ? p.features : [],
      subscriberCount: subs.filter(s => s.planId === p.id && s.status === "active").length,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, price, cpu, ram, disk, bandwidth, features } = req.body;
    const [plan] = await db.insert(plansTable).values({ name, price: price.toString(), cpu, ram, disk, bandwidth, features: features || [] }).returning();
    res.status(201).json({ ...plan, price: parseFloat(plan.price), features: plan.features as string[], subscriberCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/plans/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const { name, price, isActive, features } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price.toString();
    if (isActive !== undefined) updates.isActive = isActive;
    if (features !== undefined) updates.features = features;

    const [plan] = await db.update(plansTable).set(updates).where(eq(plansTable.id, parseInt(req.params.id))).returning();
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ ...plan, price: parseFloat(plan.price), features: plan.features as string[], subscriberCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/plans/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });
    await db.delete(plansTable).where(eq(plansTable.id, parseInt(req.params.id)));
    res.json({ message: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
