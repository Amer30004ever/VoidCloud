import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tenantsRouter from "./tenants";
import clustersRouter from "./clusters";
import vpsRouter from "./vps";
import plansRouter from "./plans";
import billingRouter from "./billing";
import crmRouter from "./crm";
import conversationsRouter from "./conversations";
import monitoringRouter from "./monitoring";
import auditRouter from "./audit";
import notificationsRouter from "./notifications";
import maintenanceRouter from "./maintenance";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tenantsRouter);
router.use(clustersRouter);
router.use(vpsRouter);
router.use(plansRouter);
router.use(billingRouter);
router.use(crmRouter);
router.use(conversationsRouter);
router.use(monitoringRouter);
router.use(auditRouter);
router.use(notificationsRouter);
router.use(maintenanceRouter);
router.use(dashboardRouter);

export default router;
