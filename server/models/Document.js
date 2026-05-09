import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  documentType: {
    type: String,
    enum: [
      "aadhaar_card",
      "pan_card",
      "resume",
      "offer_letter",
      "certificate",
      "experience_letter",
      "salary_slip",
      "id_proof",
      "education_document",
      "project_document",
      "error_screenshot",
      "other"
    ],
    required: true
  },
  title: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true, trim: true },
  storageProvider: {
    type: String,
    enum: ["local", "cloudinary", "s3"],
    default: "local"
  },
  originalName: { type: String, required: true, trim: true },
  mimeType: { type: String, default: "", trim: true },
  size: { type: Number, default: 0 },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

schema.index({ employee: 1, documentType: 1, createdAt: -1 });

export default mongoose.model("Document", schema);
