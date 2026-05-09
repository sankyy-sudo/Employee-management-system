import Appreciation from "../models/Appreciation.js";

const canManage = (role) => ["admin", "hr"].includes(role);

export const getAppreciations = async (req, res) => {
  const query = {};

  if (canManage(req.user.role)) {
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    }
  } else {
    query.employee = req.user.id;
  }

  const appreciations = await Appreciation.find(query)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "recognizedBy", select: "name role" })
    .sort({ createdAt: -1 });

  res.json(appreciations);
};

export const createAppreciation = async (req, res) => {
  const appreciation = await Appreciation.create({
    ...req.body,
    recognizedBy: req.user.id
  });

  const populated = await Appreciation.findById(appreciation._id)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "recognizedBy", select: "name role" });

  res.status(201).json(populated);
};

export const deleteAppreciation = async (req, res) => {
  const appreciation = await Appreciation.findByIdAndDelete(req.params.id);

  if (!appreciation) {
    return res.status(404).json({ message: "Appreciation record not found" });
  }

  res.json({ message: "Appreciation deleted successfully" });
};
