import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true, min: 2000 },
  basicSalary: { type: Number, required: true, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  allowances: { type: Number, default: 0, min: 0 },
  bonus: { type: Number, default: 0, min: 0 },
  deductions: { type: Number, default: 0, min: 0 },
  netSalary: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["draft", "processed", "paid"],
    default: "processed"
  },
  notes: { type: String, default: "", trim: true },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  paidAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model("Payroll", schema);
