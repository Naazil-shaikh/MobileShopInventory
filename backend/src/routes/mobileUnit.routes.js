import { Router } from "express";
import {
  addMobileUnitsHandler,
  searchByImeiHandler,
  updateStatusHandler,
} from "../controller/mobileUnit.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", addMobileUnitsHandler);
router.get("/imei/:imei", searchByImeiHandler);
router.patch("/:id/status", updateStatusHandler);

export default router;
