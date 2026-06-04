import { Router } from "express";
import {
  createHandler,
  updateHandler,
  deleteHandler,
  listHandler,
} from "../controller/repair.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(listHandler).post(createHandler);
router.patch("/:id", updateHandler);
router.delete("/:id", deleteHandler);

export default router;
