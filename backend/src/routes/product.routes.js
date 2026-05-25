import { Router } from "express";
import {
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductHandler,
  getAllProductsHandler,
} from "../controller/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createProductHandler).get(getAllProductsHandler);

router
  .route("/:id")
  .get(getProductHandler)
  .patch(updateProductHandler)
  .delete(deleteProductHandler);

export default router;
