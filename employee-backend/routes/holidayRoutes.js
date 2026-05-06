import express from "express";
import {
  createHoliday,
  deleteHoliday,
  getHolidays
} from "../controllers/holidayController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getHolidays);
router.post("/", isManager, createHoliday);
router.delete("/:id", isManager, deleteHoliday);

export default router;
