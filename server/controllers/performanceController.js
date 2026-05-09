import PerformanceReview from "../models/PerformanceReview.js";

const canManage = (role) => ["admin", "hr"].includes(role);

export const getPerformanceReviews = async (req, res) => {
  const query = {};

  if (canManage(req.user.role)) {
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    }
  } else {
    query.employee = req.user.id;
  }

  const reviews = await PerformanceReview.find(query)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "reviewer", select: "name role" })
    .sort({ createdAt: -1 });

  res.json(reviews);
};

export const createPerformanceReview = async (req, res) => {
  const review = await PerformanceReview.create({
    ...req.body,
    reviewer: req.user.id
  });

  const populated = await PerformanceReview.findById(review._id)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "reviewer", select: "name role" });

  res.status(201).json(populated);
};

export const updatePerformanceReview = async (req, res) => {
  const review = await PerformanceReview.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "reviewer", select: "name role" });

  if (!review) {
    return res.status(404).json({ message: "Performance review not found" });
  }

  res.json(review);
};
