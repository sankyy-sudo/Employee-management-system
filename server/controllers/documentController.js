import Document from "../models/Document.js";
import User from "../models/User.js";

const canManageDocuments = (role) => ["admin", "hr"].includes(role);

const getFileUrl = (req) => {
  if (req.file?.path?.startsWith("http")) return req.file.path;
  return `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
};

export const getDocuments = async (req, res) => {
  const query = {};

  if (canManageDocuments(req.user.role)) {
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    }
  } else {
    query.employee = req.user.id;
  }

  const documents = await Document.find(query)
    .populate({ path: "employee", select: "name email department role" })
    .populate({ path: "uploadedBy", select: "name role" })
    .sort({ createdAt: -1 });

  res.json(documents);
};

export const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Document file is required" });
  }

  const employeeId =
    canManageDocuments(req.user.role) && req.body.employeeId ? req.body.employeeId : req.user.id;

  const employee = await User.findById(employeeId).select("name");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const document = await Document.create({
    employee: employeeId,
    documentType: req.body.documentType,
    title: req.body.title || req.file.originalname,
    fileName: req.file.filename,
    fileUrl: getFileUrl(req),
    storageProvider: req.file?.path?.startsWith("http") ? "cloudinary" : "local",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user.id
  });

  const populated = await Document.findById(document._id)
    .populate({ path: "employee", select: "name email department role" })
    .populate({ path: "uploadedBy", select: "name role" });

  res.status(201).json(populated);
};

export const updateDocument = async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }

  if (!canManageDocuments(req.user.role) && String(document.employee) !== req.user.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  const updates = {
    title: req.body.title || document.title,
    documentType: req.body.documentType || document.documentType,
    uploadedBy: req.user.id
  };

  if (req.file) {
    updates.fileName = req.file.filename;
    updates.fileUrl = getFileUrl(req);
    updates.storageProvider = req.file?.path?.startsWith("http") ? "cloudinary" : "local";
    updates.originalName = req.file.originalname;
    updates.mimeType = req.file.mimetype;
    updates.size = req.file.size;
  }

  const updated = await Document.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  })
    .populate({ path: "employee", select: "name email department role" })
    .populate({ path: "uploadedBy", select: "name role" });

  res.json(updated);
};

export const deleteDocument = async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }

  if (!canManageDocuments(req.user.role) && String(document.employee) !== req.user.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  await Document.findByIdAndDelete(req.params.id);

  res.json({ message: "Document deleted successfully" });
};
