import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema({
  paid: { type: Number, default: 18 },
  sick: { type: Number, default: 10 },
  casual: { type: Number, default: 7 },
  medical: { type: Number, default: 10 },
  emergency: { type: Number, default: 5 }
}, { _id: false });

const faceProfileSchema = new mongoose.Schema({
  embedding: [{ type: Number }],
  model: { type: String, default: "face-api.js" },
  enrolledAt: { type: Date, default: null },
  updatedAt: { type: Date, default: null }
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, default: "", trim: true },
  relation: { type: String, default: "", trim: true },
  phone: { type: String, default: "", trim: true }
}, { _id: false });

const schema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    default: () => `EMS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "hr", "employee"], default: "employee" },
  designation: { type: String, default: "", trim: true },
  gender: { type: String, default: "", trim: true },
  projectId: { type: String, default: "", trim: true },
  department: { type: String, default: "" },
  salary: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  phone: { type: String, default: "", trim: true },
  dateOfJoining: { type: Date, default: null },
  dateOfBirth: { type: Date, default: null },
  skills: [{ type: String, trim: true }],
  projectsWorkedOn: [{ type: String, trim: true }],
  bloodGroup: { type: String, default: "", trim: true },
  permanentAddress: { type: String, default: "", trim: true },
  currentAddress: { type: String, default: "", trim: true },
  city: { type: String, default: "", trim: true },
  state: { type: String, default: "", trim: true },
  country: { type: String, default: "", trim: true },
  postalCode: { type: String, default: "", trim: true },
  motherName: { type: String, default: "", trim: true },
  fatherName: { type: String, default: "", trim: true },
  siblings: { type: String, default: "", trim: true },
  familyInsuranceDetails: { type: String, default: "", trim: true },
  experience: { type: String, default: "", trim: true },
  projectHistory: { type: String, default: "", trim: true },
  shiftDetails: { type: String, default: "", trim: true },
  performanceSummary: { type: String, default: "", trim: true },
  emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
  appreciation: { type: String, default: "", trim: true },
  leaveBalance: { type: leaveBalanceSchema, default: () => ({}) },
  faceProfile: { type: faceProfileSchema, default: () => ({}) },
  profileImage: { type: String, default: null }, // Path to profile image
  refreshTokenHash: { type: String, default: "" },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

schema.index({ role: 1, department: 1 });
schema.index({ status: 1 });

export default mongoose.model("User", schema);
