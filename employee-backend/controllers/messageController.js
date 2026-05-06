import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  const filter = {};

  if (req.query.userA && req.query.userB) {
    filter.$or = [
      { sender: req.query.userA, receiver: req.query.userB },
      { sender: req.query.userB, receiver: req.query.userA }
    ];
  }

  const msgs = await Message.find(filter).sort({ createdAt: 1 });
  res.json(msgs);
};

export const sendMessage = async (req, res) => {
  const message = await Message.create(req.body);
  res.status(201).json(message);
};
