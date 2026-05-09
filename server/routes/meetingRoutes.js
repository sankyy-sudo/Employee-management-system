import express from "express";
import {
  createMeeting,
  deleteMeeting,
  getMeetings,
  updateMeeting
} from "../controllers/meetingController.js";

const router = express.Router();

router.get("/", getMeetings);
router.post("/", createMeeting);
router.put("/:id", updateMeeting);
router.delete("/:id", deleteMeeting);

export default router;
