import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createSale,
  getSaleHistory,
  getInvoiceDetails,
} from "../services/sale.service.js";

const createSaleHandler = asyncHandler(async (req, res) => {
  const sale = await createSale({
    ...req.body,
    soldBy: req.user._id,
    shopId: req.user.shopId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, sale, "Sale created successfully"));
});

const getSaleHistoryHandler = asyncHandler(async (req, res) => {
  const data = await getSaleHistory(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Sale history fetched successfully"));
});

const getInvoiceHandler = asyncHandler(async (req, res) => {
  const invoice = await getInvoiceDetails(req.params.identifier, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice fetched successfully"));
});

export { createSaleHandler, getSaleHistoryHandler, getInvoiceHandler };
