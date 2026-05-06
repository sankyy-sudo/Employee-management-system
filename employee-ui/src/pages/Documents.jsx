import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";

const initialForm = {
  title: "",
  documentType: "resume",
  employeeId: "",
  file: null
};

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const isManager = ["admin", "hr"].includes(user?.role);

  const loadData = async () => {
    const documentRequest = api.get("/documents", {
      params: isManager && selectedEmployee ? { employeeId: selectedEmployee } : {}
    });

    if (isManager) {
      const [documentRes, employeeRes] = await Promise.all([
        documentRequest,
        api.get("/employees", { params: { role: "employee" } })
      ]);
      setDocuments(documentRes.data);
      setEmployees(employeeRes.data);
      return;
    }

    const { data } = await documentRequest;
    setDocuments(data);
  };

  useEffect(() => {
    loadData();
  }, [selectedEmployee, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.file) return;

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("documentType", form.documentType);
      payload.append("file", form.file);

      if (isManager && form.employeeId) {
        payload.append("employeeId", form.employeeId);
      }

      await api.post("/documents", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setForm({
        ...initialForm,
        employeeId: isManager ? form.employeeId : ""
      });
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (documentId) => {
    await api.delete(`/documents/${documentId}`);
    await loadData();
  };

  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: employee._id,
    label: `${employee.name} • ${employee.department || "Team"}`
  })), [employees]);

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Document Management</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {isManager ? "Upload Employee Document" : "Upload My Document"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Upload resumes, ID proofs, certificates, and other supporting documents.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isManager && (
              <Select
                label="Employee"
                value={form.employeeId}
                onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
                options={employeeOptions}
                placeholder="Select employee"
                required
              />
            )}

            <Input
              label="Document Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />

            <Select
              label="Document Type"
              value={form.documentType}
              onChange={(event) => setForm({ ...form, documentType: event.target.value })}
              options={[
                { value: "resume", label: "Resume" },
                { value: "id_proof", label: "ID Proof" },
                { value: "project_document", label: "Project Document" },
                { value: "error_screenshot", label: "Error Screenshot" },
                { value: "certificate", label: "Certificate" },
                { value: "other", label: "Other" }
              ]}
            />

            <label className="block text-sm font-medium text-slate-700">
              File
              <input
                required
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              />
            </label>

            <button
              disabled={submitting}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              {submitting ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          {isManager && (
            <section className="glass-panel rounded-[30px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Filter</p>
                  <h2 className="mt-2 text-xl font-semibold">Employee Documents</h2>
                </div>
                <select
                  value={selectedEmployee}
                  onChange={(event) => {
                    setSelectedEmployee(event.target.value);
                    setForm((current) => ({ ...current, employeeId: event.target.value }));
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">All employees</option>
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          <section className="glass-panel rounded-[30px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{isManager ? "Document Library" : "My Documents"}</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {documents.length} files
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {documents.map((document) => (
                <div key={document._id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {humanizeDocumentType(document.documentType)} • {document.employee?.name || user.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Uploaded {formatDateTime(document.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={document.fileUrl || `${api.defaults.baseURL?.replace("/api", "")}/uploads/${document.fileName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(document._id)}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!documents.length && (
                <div className="rounded-[22px] bg-slate-50/80 p-4 text-sm text-slate-500">
                  No documents uploaded yet.
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </Layout>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        required={required}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      >
        <option value="">{placeholder || "Select option"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function humanizeDocumentType(type) {
  if (type === "id_proof") return "ID Proof";
  if (type === "project_document") return "Project Document";
  if (type === "error_screenshot") return "Error Screenshot";
  if (type === "certificate") return "Certificate";
  if (type === "resume") return "Resume";
  return "Other";
}
