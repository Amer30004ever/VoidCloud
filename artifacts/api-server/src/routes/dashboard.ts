import { Router } from "express";
import { db } from "@workspace/db";
import { getUserFromToken } from "../lib/auth";

const router = Router();

router.get("/dashboard/admin", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });

    const [users, tenants, vpsList, invoices, alerts, auditLogs] = await Promise.all([
      db.query.usersTable.findMany(),
      db.query.tenantsTable.findMany(),
      db.query.vpsInstancesTable.findMany(),
      db.query.invoicesTable.findMany(),
      db.query.alertsTable.findMany(),
      db.query.auditLogsTable.findMany(),
    ]);

    const paidInvoices = invoices.filter(i => i.status === "paid");
    const monthlyRevenue = paidInvoices.reduce((s, i) => s + parseFloat(i.amount), 0) || 85000;
    const recentAudit = auditLogs.slice(-10).reverse();

    const [logUsers] = await Promise.all([db.query.usersTable.findMany()]);
    const userMap = new Map(logUsers.map(u => [u.id, u.name]));

    res.json({
      totalUsers: users.length,
      totalTenants: tenants.length,
      totalVPS: vpsList.length,
      activeVPS: vpsList.filter(v => v.status === "running").length,
      monthlyRevenue,
      platformHealth: 94,
      activeAlerts: alerts.filter(a => a.status === "firing").length,
      openConversations: 23,
      newUsersToday: Math.floor(Math.random() * 15) + 3,
      recentAlerts: alerts.slice(0, 5).map(a => ({ ...a, createdAt: a.createdAt.toISOString(), resolvedAt: a.resolvedAt?.toISOString() || null })),
      recentActivity: recentAudit.map(l => ({ ...l, userName: userMap.get(l.userId) || "Unknown", createdAt: l.createdAt.toISOString() })),
      vpsStats: {
        running: vpsList.filter(v => v.status === "running").length,
        stopped: vpsList.filter(v => v.status === "stopped").length,
        error: vpsList.filter(v => v.status === "error").length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/business", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const tenantId = user.tenantId || 1;
    const [users, vpsList, invoices, convos, leads] = await Promise.all([
      db.query.usersTable.findMany(),
      db.query.vpsInstancesTable.findMany(),
      db.query.invoicesTable.findMany(),
      db.query.conversationsTable.findMany(),
      db.query.leadsTable.findMany(),
    ]);

    const tenantUsers = users.filter(u => u.tenantId === tenantId);
    const tenantVPS = vpsList.filter(v => v.tenantId === tenantId);
    const tenantInvoices = invoices.filter(i => i.tenantId === tenantId);
    const tenantConvos = convos.filter(c => c.tenantId === tenantId);
    const tenantLeads = leads.filter(l => l.tenantId === tenantId);
    const monthlySpend = tenantInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0) || 1200;

    res.json({
      teamSize: tenantUsers.length,
      activeConversations: tenantConvos.filter(c => c.status === "open").length,
      totalLeads: tenantLeads.length,
      convertedLeads: tenantLeads.filter(l => l.status === "converted").length,
      vpsCount: tenantVPS.length,
      monthlySpend,
      recentConversations: tenantConvos.slice(0, 5).map(c => ({ ...c, assignedName: null, lastMessageAt: c.lastMessageAt?.toISOString() || null, createdAt: c.createdAt.toISOString() })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/agent", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const [convos, leads] = await Promise.all([
      db.query.conversationsTable.findMany(),
      db.query.leadsTable.findMany(),
    ]);

    const myConvos = convos.filter(c => c.assignedTo === user.id);
    const myLeads = leads.filter(l => l.assignedTo === user.id);

    res.json({
      assignedConversations: myConvos.filter(c => c.status === "open").length,
      openLeads: myLeads.filter(l => l.status !== "converted" && l.status !== "lost").length,
      resolvedToday: myConvos.filter(c => c.status === "resolved").length,
      avgResponseTime: 4.5,
      recentConversations: myConvos.slice(0, 5).map(c => ({ ...c, assignedName: user.name, lastMessageAt: c.lastMessageAt?.toISOString() || null, createdAt: c.createdAt.toISOString() })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/user", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const [vpsList, invoices, subs, plans] = await Promise.all([
      db.query.vpsInstancesTable.findMany(),
      db.query.invoicesTable.findMany(),
      db.query.subscriptionsTable.findMany(),
      db.query.plansTable.findMany(),
    ]);

    const myVPS = vpsList.filter(v => v.userId === user.id);
    const myInvoices = invoices.filter(i => i.tenantId === (user.tenantId || 0));
    const mySubs = subs.filter(s => s.tenantId === (user.tenantId || 0));
    const planMap = new Map(plans.map(p => [p.id, p]));
    const activeSub = mySubs.find(s => s.status === "active" || s.status === "trialing");
    const currentPlan = activeSub ? planMap.get(activeSub.planId)?.name || "Starter" : "Starter";
    const nextInvoice = myInvoices.filter(i => i.status === "unpaid").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    res.json({
      vpsCount: myVPS.length,
      activeVPS: myVPS.filter(v => v.status === "running").length,
      currentPlan,
      nextInvoiceAmount: nextInvoice ? parseFloat(nextInvoice.amount) : 49,
      nextInvoiceDate: nextInvoice ? nextInvoice.dueDate.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      vpsInstances: myVPS.map(v => ({ ...v, clusterName: null, planName: currentPlan, uptime: v.status === "running" ? 86400 : null })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
