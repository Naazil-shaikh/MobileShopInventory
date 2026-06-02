import mongoose from "mongoose";

const reportArchiveSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: [
        "stock_daily",
        "stock_monthly",
        "stock_yearly",
        "sales_summary",
        "profit_summary",
        "receivables",
        "payables",
        "cashbook_summary",
      ],
      required: true,
    },
    periodLabel: { type: String, required: true, trim: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

reportArchiveSchema.index({ shopId: 1, reportType: 1, year: 1, month: 1 });

export const ReportArchive = mongoose.model("ReportArchive", reportArchiveSchema);
