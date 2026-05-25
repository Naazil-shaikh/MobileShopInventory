import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const assertValidObjectId = (id, fieldName = "id") => {
  if (!id || !isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};

export { isValidObjectId, assertValidObjectId };
