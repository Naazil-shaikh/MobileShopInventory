import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createPurchaseBill,
  payPurchaseBill,
  listPurchaseBills,
  addCashbookEntry,
  getCashbook,
  recordInstallmentPayment,
  recordSaleReceivablePayment,
  listReceivables,
  getFinanceOverview,
} from "../services/finance.service.js";

const overviewHandler = asyncHandler(async (req, res) => {
  const data = await getFinanceOverview(req.user);
  return res.status(200).json(new ApiResponse(200, data, "Finance overview"));
});

const createBillHandler = asyncHandler(async (req, res) => {
  const bill = await createPurchaseBill(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, bill, "Purchase bill created"));
});

const payBillHandler = asyncHandler(async (req, res) => {
  const bill = await payPurchaseBill(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, bill, "Payment recorded"));
});

const listBillsHandler = asyncHandler(async (req, res) => {
  const data = await listPurchaseBills(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, data, "Purchase bills fetched"));
});

const addCashbookHandler = asyncHandler(async (req, res) => {
  const entry = await addCashbookEntry(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, entry, "Cashbook entry added"));
});

const getCashbookHandler = asyncHandler(async (req, res) => {
  const data = await getCashbook(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, data, "Cashbook fetched"));
});

const payInstallmentHandler = asyncHandler(async (req, res) => {
  const inst = await recordInstallmentPayment(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, inst, "Installment payment recorded"));
});

const paySaleReceivableHandler = asyncHandler(async (req, res) => {
  const sale = await recordSaleReceivablePayment(
    req.params.saleId,
    req.body,
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, sale, "Customer balance payment recorded"));
});

const listReceivablesHandler = asyncHandler(async (req, res) => {
  const data = await listReceivables(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, data, "Receivables fetched"));
});

export {
  overviewHandler,
  createBillHandler,
  payBillHandler,
  listBillsHandler,
  addCashbookHandler,
  getCashbookHandler,
  payInstallmentHandler,
  paySaleReceivableHandler,
  listReceivablesHandler,
};
