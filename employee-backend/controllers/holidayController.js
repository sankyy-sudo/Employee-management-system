import Holiday from "../models/Holiday.js";

export const getHolidays = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const query = req.query.all === "true"
    ? {}
    : { date: { $gte: today } };

  const holidays = await Holiday.find(query).sort({ date: 1 });
  res.json(holidays);
};

export const createHoliday = async (req, res) => {
  const holiday = await Holiday.create({
    ...req.body,
    createdBy: req.user.id
  });

  res.status(201).json(holiday);
};

export const deleteHoliday = async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);

  if (!holiday) {
    return res.status(404).json({ message: "Holiday not found" });
  }

  res.json({ message: "Holiday deleted successfully" });
};
