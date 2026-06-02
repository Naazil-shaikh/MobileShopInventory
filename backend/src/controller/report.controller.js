import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getStockReport,
  getArchivedReports,
  getProfitSummary,
} from "../services/report.service.js";

const stockReportHandler = asyncHandler(async (req, res) => {
  const { period } = req.params;
  const archiveAndPurge = req.query.archiveAndPurge === "true";
  const year = req.query.year ? Number(req.query.year) : undefined;

  const data = await getStockReport(req.user, period, {
    archiveAndPurge,
    year,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, data, `${period} stock report generated`));
});

const archivedReportsHandler = asyncHandler(async (req, res) => {
  const reports = await getArchivedReports(req.user, req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, reports, "Archived reports fetched"));
});

const profitSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getProfitSummary(req.user, req.query.period || "month");
  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Profit summary fetched"));
});

export { stockReportHandler, archivedReportsHandler, profitSummaryHandler };
