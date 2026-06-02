import { Router } from "express";
import {
  createHandler,
  listHandler,
} from "../controller/saleReturn.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(listHandler).post(createHandler);

export default router;
