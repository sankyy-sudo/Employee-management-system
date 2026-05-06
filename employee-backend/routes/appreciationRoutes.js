import express from "express";
import {
  createAppreciation,
  deleteAppreciation,
  getAppreciations
} from "../controllers/appreciationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getAppreciations);
router.post("/", isManager, createAppreciation);
router.delete("/:id", isManager, deleteAppreciation);

export default router;
