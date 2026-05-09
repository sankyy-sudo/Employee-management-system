import express from "express";
import {
  createHoliday,
  deleteHoliday,
  getHolidays
} from "../controllers/holidayController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getHolidays);
router.post("/", isAdmin, createHoliday);
router.delete("/:id", isAdmin, deleteHoliday);

export default router;
