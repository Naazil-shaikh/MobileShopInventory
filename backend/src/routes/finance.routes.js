import { Router } from "express";
import {
  overviewHandler,
  createBillHandler,
  payBillHandler,
  listBillsHandler,
  addCashbookHandler,
  getCashbookHandler,
  payInstallmentHandler,
  paySaleReceivableHandler,
  listReceivablesHandler,
} from "../controller/finance.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/overview", overviewHandler);
router.get("/payables", listBillsHandler);
router.post("/payables", createBillHandler);
router.post("/payables/:id/pay", payBillHandler);
router.get("/receivables", listReceivablesHandler);
router.post("/receivables/sale/:saleId/pay", paySaleReceivableHandler);
router.post("/receivables/:id/pay", payInstallmentHandler);
router.get("/cashbook", getCashbookHandler);
router.post("/cashbook", addCashbookHandler);

export default router;
