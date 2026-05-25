import { Router } from "express";
import {
  createSaleHandler,
  getSaleHistoryHandler,
  getInvoiceHandler,
} from "../controller/sale.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createSaleHandler).get(getSaleHistoryHandler);
router.get("/invoice/:identifier", getInvoiceHandler);

export default router;
