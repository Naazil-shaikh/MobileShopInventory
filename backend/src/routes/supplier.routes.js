import { Router } from "express";
import {
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  listSuppliersHandler,
} from "../controller/supplier.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createSupplierHandler).get(listSuppliersHandler);

router
  .route("/:id")
  .patch(updateSupplierHandler)
  .delete(deleteSupplierHandler);

export default router;
