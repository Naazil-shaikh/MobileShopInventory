import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";

import authRouter from "./routes/auth.routes.js";
import productRouter from "./routes/product.routes.js";
import supplierRouter from "./routes/supplier.routes.js";
import customerRouter from "./routes/customer.routes.js";
import mobileUnitRouter from "./routes/mobileUnit.routes.js";
import inventoryRouter from "./routes/inventory.routes.js";
import saleRouter from "./routes/sale.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mobile Shop Inventory API is running",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/suppliers", supplierRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/mobile-units", mobileUnitRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/sales", saleRouter);

app.use(errorHandler);

export { app };
