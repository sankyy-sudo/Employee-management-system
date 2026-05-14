import mongoose from "mongoose";

const schema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  cardNumber: { type: String, required: true, unique: true },
  cardType: {
    type: String,
    enum: ["proximity", "contact", "smart_card", "nfc"],
    default: "proximity"
  },

  // Assignment
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedDate: { type: Date, default: Date.now },

  // Card status
  status: {
    type: String,
    enum: ["active", "inactive", "lost", "suspended", "expired"],
    default: "active"
  },

  // Card details
  cardHolderName: { type: String, required: true },
  expiryDate: { type: Date, default: null },
  issueDate: { type: Date, default: Date.now },

  // Security
  encryptedData: { type: String, default: null },
  checksumDigit: { type: String, default: null },

  // Tracking
  lastUsed: { type: Date, default: null },
  usageCount: { type: Number, default: 0 },

  // Lost card handling
  reportedLostDate: { type: Date, default: null },
  replacementCardId: { type: mongoose.Schema.Types.ObjectId, ref: "RFIDCard", default: null },

  // Device info
  lastScannedDevice: { type: mongoose.Schema.Types.ObjectId, ref: "BiometricDevice", default: null },

  // Notes
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

schema.index({ employee: 1 });
schema.index({ status: 1 });

export default mongoose.model("RFIDCard", schema);