import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  description: { type: String, default: "", trim: true },
  isNationalHoliday: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { timestamps: true });

schema.index({ date: 1 }, { unique: true });

export default mongoose.model("Holiday", schema);
