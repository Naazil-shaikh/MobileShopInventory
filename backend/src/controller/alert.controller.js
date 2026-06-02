import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAlerts } from "../services/alert.service.js";

const getAlertsHandler = asyncHandler(async (req, res) => {
  const data = await getAlerts(req.user);
  return res.status(200).json(new ApiResponse(200, data, "Alerts fetched"));
});

export { getAlertsHandler };
