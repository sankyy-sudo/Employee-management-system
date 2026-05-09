import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const POPULATE_PROJECT = [
  { path: "assignments.employee", select: "employeeId name email department designation skills projectsWorkedOn projectId" },
  { path: "createdBy", select: "name role" }
];

const hydrateProject = (id) => Project.findById(id).populate(POPULATE_PROJECT);

const emitProjectEvent = (req, project, type = "updated", message) => {
  const io = req.app.get("io");
  if (!io || !project) return;

  io.emit("project:updated", {
    type,
    project,
    message: message || `${project.name} ${type}`,
    timestamp: new Date().toISOString()
  });
};

const syncEmployeeProjects = async (project) => {
  const employeeIds = project.assignments.map((assignment) => assignment.employee);
  if (!employeeIds.length) return;

  await User.updateMany(
    { _id: { $in: employeeIds } },
    {
      $addToSet: { projectsWorkedOn: project.name },
      $set: { projectId: project.projectId }
    }
  );
};

export const getProjects = async (req, res) => {
  const projects = await Project.find({})
    .populate(POPULATE_PROJECT)
    .sort({ updatedAt: -1, createdAt: -1 });

  res.json(projects);
};

export const createProject = async (req, res) => {
  const project = await Project.create({
    ...req.body,
    createdBy: req.user.id
  });

  await syncEmployeeProjects(project);
  const hydrated = await hydrateProject(project._id);
  emitProjectEvent(req, hydrated, "created", `${hydrated.name} created`);
  res.status(201).json(hydrated);
};

export const updateProject = async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  await syncEmployeeProjects(project);
  const hydrated = await hydrateProject(project._id);
  emitProjectEvent(req, hydrated, "updated", `${hydrated.name} updated`);
  res.json(hydrated);
};

export const assignEmployees = async (req, res) => {
  const { assignments = [] } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  assignments.forEach((assignment) => {
    const employeeId = assignment.employee || assignment.employeeId;
    if (!employeeId) return;

    const existingIndex = project.assignments.findIndex((item) => String(item.employee) === String(employeeId));
    const nextAssignment = {
      employee: employeeId,
      role: assignment.role || "Contributor",
      joiningDate: assignment.joiningDate || new Date(),
      deadline: assignment.deadline || project.deadline,
      notes: assignment.notes || "",
      progress: Number(assignment.progress || 0)
    };

    if (existingIndex >= 0) {
      project.assignments.set(existingIndex, nextAssignment);
    } else {
      project.assignments.push(nextAssignment);
    }
  });

  await project.save();
  await syncEmployeeProjects(project);

  await Promise.all(project.assignments.map((assignment) => Notification.create({
    recipient: assignment.employee,
    sender: req.user.id,
    type: "project",
    title: "Project assignment updated",
    message: `You have been assigned to ${project.name}`,
    link: "/dashboard"
  }).catch(() => null)));

  const hydrated = await hydrateProject(project._id);
  emitProjectEvent(req, hydrated, "assigned", `${hydrated.name} assignment updated`);
  res.json(hydrated);
};

export const removeEmployeeFromProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  project.assignments = project.assignments.filter((assignment) => String(assignment.employee) !== String(req.params.employeeId));
  await project.save();

  const hydrated = await hydrateProject(project._id);
  emitProjectEvent(req, hydrated, "reassigned", `${hydrated.name} assignment removed`);
  res.json(hydrated);
};

export const deleteProject = async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  emitProjectEvent(req, project, "deleted", `${project.name} deleted`);
  res.json({ message: "Project deleted successfully" });
};
