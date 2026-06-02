import { Router } from "express";
import { getAlertsHandler } from "../controller/alert.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);
router.get("/", getAlertsHandler);

export default router;
