import express from "express";
import {
  assignEmployees,
  createProject,
  deleteProject,
  getProjects,
  removeEmployeeFromProject,
  updateProject
} from "../controllers/projectController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.post("/:id/assign", assignEmployees);
router.delete("/:id/employees/:employeeId", removeEmployeeFromProject);
router.delete("/:id", deleteProject);

export default router;
