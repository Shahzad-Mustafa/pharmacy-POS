import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import branchesRouter from "./branches";
import medicinesRouter from "./medicines";
import inventoryRouter from "./inventory";
import patientsRouter from "./patients";
import prescriptionsRouter from "./prescriptions";
import salesRouter from "./sales";
import suppliersRouter from "./suppliers";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(branchesRouter);
router.use(medicinesRouter);
router.use(inventoryRouter);
router.use(patientsRouter);
router.use(prescriptionsRouter);
router.use(salesRouter);
router.use(suppliersRouter);
router.use(dashboardRouter);

export default router;
