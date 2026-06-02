import { Router } from "express";
import {
  createHandler,
  updateHandler,
  listHandler,
} from "../controller/repair.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(listHandler).post(createHandler);
router.patch("/:id", updateHandler);

export default router;
