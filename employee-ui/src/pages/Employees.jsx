import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";

const emptyEmployee = {
  employeeId: "",
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "",
  status: "Active",
  phone: "+91",
  dateOfJoining: "",
  dateOfBirth: "",
  skills: "",
  projectsWorkedOn: "",
  bloodGroup: "",
  permanentAddress: "",
  currentAddress: "",
  motherName: "",
  fatherName: "",
  siblings: "",
  emergencyContact: {
    name: "",
    relation: "",
    phone: ""
  },
  appreciation: ""
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);

  const loadEmployees = async () => {
    const { data } = await api.get("/employees");
    setEmployees(data);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editingId) {
      await api.put(`/employees/${editingId}`, {
        ...form,
        password: form.password || undefined
      });
    } else {
      await api.post("/employees", form);
    }

    resetForm();
    await loadEmployees();
  };

  const removeEmployee = async (id) => {
    await api.delete(`/employees/${id}`);
    await loadEmployees();
  };

  const startEdit = (employee) => {
    setEditingId(employee._id);
    setForm({
      employeeId: employee.employeeId || "",
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      role: employee.role || "employee",
      department: employee.department || "",
      status: employee.status || "Active",
      phone: employee.phone || "+91",
      dateOfJoining: toInputDate(employee.dateOfJoining),
      dateOfBirth: toInputDate(employee.dateOfBirth),
      skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : "",
      projectsWorkedOn: Array.isArray(employee.projectsWorkedOn) ? employee.projectsWorkedOn.join(", ") : "",
      bloodGroup: employee.bloodGroup || "",
      permanentAddress: employee.permanentAddress || "",
      currentAddress: employee.currentAddress || "",
      motherName: employee.motherName || "",
      fatherName: employee.fatherName || "",
      siblings: employee.siblings || "",
      emergencyContact: {
        name: employee.emergencyContact?.name || "",
        relation: employee.emergencyContact?.relation || "",
        phone: employee.emergencyContact?.phone || ""
      },
      appreciation: employee.appreciation || ""
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyEmployee);
  };

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{editingId ? "Edit Employee" : "Add Employee"}</h1>
            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input
              label="Employee ID"
              required={false}
              value={form.employeeId}
              onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
            />
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input
              label={editingId ? "Password (optional)" : "Password"}
              type="password"
              required={!editingId}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                options={[
                  { value: "employee", label: "Employee" },
                  { value: "hr", label: "HR" },
                  { value: "admin", label: "Admin" }
                ]}
              />
              <Input
                label="Department"
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" }
                ]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Emergency Contact"
                value={form.emergencyContact.name}
                onChange={(event) => setForm({
                  ...form,
                  emergencyContact: { ...form.emergencyContact, name: event.target.value }
                })}
              />
              <Input
                label="Relation"
                value={form.emergencyContact.relation}
                onChange={(event) => setForm({
                  ...form,
                  emergencyContact: { ...form.emergencyContact, relation: event.target.value }
                })}
              />
              <Input
                label="Emergency Phone"
                value={form.emergencyContact.phone}
                onChange={(event) => setForm({
                  ...form,
                  emergencyContact: { ...form.emergencyContact, phone: event.target.value }
                })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Input label="Blood Group" value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Date of Joining"
                type="date"
                value={form.dateOfJoining}
                onChange={(event) => setForm({ ...form, dateOfJoining: event.target.value })}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
              />
            </div>

            <Input
              label="Skills"
              value={form.skills}
              onChange={(event) => setForm({ ...form, skills: event.target.value })}
            />
            <Input
              label="Projects Worked On"
              value={form.projectsWorkedOn}
              onChange={(event) => setForm({ ...form, projectsWorkedOn: event.target.value })}
            />
            <Textarea
              label="Permanent Address"
              value={form.permanentAddress}
              onChange={(event) => setForm({ ...form, permanentAddress: event.target.value })}
            />
            <Textarea
              label="Current Address"
              value={form.currentAddress}
              onChange={(event) => setForm({ ...form, currentAddress: event.target.value })}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Mother Name"
                value={form.motherName}
                onChange={(event) => setForm({ ...form, motherName: event.target.value })}
              />
              <Input
                label="Father Name"
                value={form.fatherName}
                onChange={(event) => setForm({ ...form, fatherName: event.target.value })}
              />
              <Input
                label="Siblings"
                value={form.siblings}
                onChange={(event) => setForm({ ...form, siblings: event.target.value })}
              />
            </div>

            <Textarea
              label="Appreciation"
              value={form.appreciation}
              onChange={(event) => setForm({ ...form, appreciation: event.target.value })}
            />

            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">
              {editingId ? "Update Employee" : "Add Employee"}
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-2xl font-semibold">Team Directory</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee._id} className="border-t border-slate-100">
                    <td className="py-3">
                      <p>{employee.name}</p>
                      <p className="text-xs text-slate-500">{employee.employeeId || "No ID"} • Completion {employee.profileCompletion ?? 0}%</p>
                    </td>
                    <td className="py-3">
                      <p>{employee.email}</p>
                      <p className="text-xs text-slate-500">{employee.phone || "--"}</p>
                    </td>
                    <td className="py-3 capitalize">{employee.role}</td>
                    <td className="py-3">{employee.department || "--"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(employee)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeEmployee(employee._id)}
                          className="rounded-xl bg-red-500 px-3 py-2 text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!employees.length && <p className="py-6 text-sm text-slate-500">No employees available yet.</p>}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Input({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        required
        value={value}
        onChange={onChange}
        className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
