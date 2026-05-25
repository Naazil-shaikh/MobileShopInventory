import { Router } from "express";
import {
  addStockHandler,
  reduceStockHandler,
  returnStockHandler,
  recordDamageHandler,
  getStockHistoryHandler,
  getLowStockHandler,
} from "../controller/inventory.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/add", addStockHandler);
router.post("/reduce", reduceStockHandler);
router.post("/return", returnStockHandler);
router.post("/damage", recordDamageHandler);
router.get("/history", getStockHistoryHandler);
router.get("/low-stock", getLowStockHandler);

export default router;
