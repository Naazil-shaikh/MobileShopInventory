import { Router } from "express";
import {
  createCustomerHandler,
  getPurchaseHistoryHandler,
} from "../controller/customer.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", createCustomerHandler);
router.get("/:id/purchases", getPurchaseHistoryHandler);

export default router;
