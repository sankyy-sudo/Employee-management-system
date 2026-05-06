import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee
} from "../controllers/employeeController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin, isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getEmployees);
router.post("/", isManager, createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", isManager, deleteEmployee);

export default router;
