import { Router } from "express";
import {
  stockReportHandler,
  archivedReportsHandler,
  profitSummaryHandler,
  exportExcelHandler,
} from "../controller/report.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/stock/:period", stockReportHandler);
router.get("/export/:period", exportExcelHandler);
router.get("/archived", archivedReportsHandler);
router.get("/profit", profitSummaryHandler);

export default router;
