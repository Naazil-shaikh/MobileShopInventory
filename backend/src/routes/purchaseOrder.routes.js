import { Router } from "express";
import {
  createHandler,
  updateStatusHandler,
  listHandler,
} from "../controller/purchaseOrder.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(listHandler).post(createHandler);
router.patch("/:id/status", updateStatusHandler);

export default router;
