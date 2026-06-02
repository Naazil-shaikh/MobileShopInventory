import { Router } from "express";
import {
  stockReportHandler,
  archivedReportsHandler,
  profitSummaryHandler,
} from "../controller/report.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/stock/:period", stockReportHandler);
router.get("/archived", archivedReportsHandler);
router.get("/profit", profitSummaryHandler);

export default router;
