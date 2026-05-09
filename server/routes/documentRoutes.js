import express from "express";
import {
  deleteDocument,
  getDocuments,
  updateDocument,
  uploadDocument
} from "../controllers/documentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getDocuments);
router.post("/", upload.single("file"), uploadDocument);
router.put("/:id", upload.single("file"), updateDocument);
router.delete("/:id", deleteDocument);

export default router;
