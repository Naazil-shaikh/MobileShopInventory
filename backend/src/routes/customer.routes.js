import { Router } from "express";
import {
  createCustomerHandler,
  getPurchaseHistoryHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from "../controller/customer.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", listCustomersHandler);
router.post("/", createCustomerHandler);
router.patch("/:id", updateCustomerHandler);
router.get("/:id/purchases", getPurchaseHistoryHandler);

export default router;
