import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
} from "../services/product.service.js";

const createProductHandler = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

const updateProductHandler = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.id, req.body, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Product deleted successfully"));
});

const getProductHandler = asyncHandler(async (req, res) => {
  const product = await getProductById(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});

const getAllProductsHandler = asyncHandler(async (req, res) => {
  const data = await getAllProducts(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Products fetched successfully"));
});

export {
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductHandler,
  getAllProductsHandler,
};
