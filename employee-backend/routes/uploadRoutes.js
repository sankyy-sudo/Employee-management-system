import express from "express";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", upload.single("file"), (req, res) => {
  res.json({ file: req.file.filename });
});

export default router;