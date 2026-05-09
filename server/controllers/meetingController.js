import Meeting from "../models/Meeting.js";

export const getMeetings = async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const meetings = await Meeting.find(filter).sort({ scheduledFor: 1 });
  res.json(meetings);
};

export const createMeeting = async (req, res) => {
  const meeting = await Meeting.create(req.body);
  res.status(201).json(meeting);
};

export const updateMeeting = async (req, res) => {
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  res.json(meeting);
};

export const deleteMeeting = async (req, res) => {
  const meeting = await Meeting.findByIdAndDelete(req.params.id);

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  res.json({ message: "Meeting deleted successfully" });
};
