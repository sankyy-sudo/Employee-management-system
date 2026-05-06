import Feedback from "../models/Feedback.js";

const canManage = (role) => ["admin", "hr"].includes(role);

export const getFeedback = async (req, res) => {
  const query = {};

  if (canManage(req.user.role)) {
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    }
  } else {
    query.$or = [
      { employee: req.user.id },
      { submittedBy: req.user.id }
    ];
  }

  const feedback = await Feedback.find(query)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "submittedBy", select: "name role" })
    .sort({ createdAt: -1 });

  res.json(feedback);
};

export const createFeedback = async (req, res) => {
  const payload = {
    ...req.body,
    submittedBy: req.user.id
  };

  if (!canManage(req.user.role)) {
    payload.employee = req.user.id;
    payload.category = "self";
  }

  const feedback = await Feedback.create(payload);

  const populated = await Feedback.findById(feedback._id)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "submittedBy", select: "name role" });

  res.status(201).json(populated);
};

export const updateFeedback = async (req, res) => {
  const existing = await Feedback.findById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Feedback not found" });
  }

  if (!canManage(req.user.role) && String(existing.submittedBy) !== req.user.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  const payload = canManage(req.user.role)
    ? req.body
    : {
        message: req.body.message ?? existing.message,
        sentiment: req.body.sentiment ?? existing.sentiment,
        visibility: req.body.visibility ?? existing.visibility
      };

  const feedback = await Feedback.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  })
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "submittedBy", select: "name role" });

  res.json(feedback);
};
