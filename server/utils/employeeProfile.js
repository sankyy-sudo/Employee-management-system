const PROFILE_FIELDS = [
  "phone",
  "dateOfJoining",
  "dateOfBirth",
  "skills",
  "projectsWorkedOn",
  "bloodGroup",
  "permanentAddress",
  "currentAddress",
  "motherName",
  "fatherName",
  "siblings",
  "emergencyContact",
  "appreciation"
];

export const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const sanitizeEmployeePayload = (payload = {}) => {
  const nextPayload = { ...payload };

  if ("skills" in payload) {
    nextPayload.skills = normalizeStringArray(payload.skills);
  }

  if ("projectsWorkedOn" in payload) {
    nextPayload.projectsWorkedOn = normalizeStringArray(payload.projectsWorkedOn);
  }

  if ("leaveBalance" in payload) {
    nextPayload.leaveBalance = normalizeLeaveBalance(payload.leaveBalance);
  }

  if (typeof payload.emergencyContact === "string") {
    nextPayload.emergencyContact = {
      name: payload.emergencyContact,
      relation: "",
      phone: ""
    };
  }

  if ("dateOfJoining" in payload && !payload.dateOfJoining) {
    nextPayload.dateOfJoining = null;
  }

  if ("dateOfBirth" in payload && !payload.dateOfBirth) {
    nextPayload.dateOfBirth = null;
  }

  return nextPayload;
};

export const normalizeLeaveBalance = (value = {}) => {
  const source = typeof value?.toObject === "function" ? value.toObject() : value;
  const paidSource = source?.paid ?? source?.annual ?? 18;

  return {
    paid: Number(paidSource ?? 18),
    sick: Number(source?.sick ?? 10),
    casual: Number(source?.casual ?? 7),
    medical: Number(source?.medical ?? 10),
    emergency: Number(source?.emergency ?? 5)
  };
};

export const getProfileCompletion = (employee) => {
  const completedFields = PROFILE_FIELDS.filter((field) => {
    const value = employee?.[field];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(value);
  }).length;

  return Math.round((completedFields / PROFILE_FIELDS.length) * 100);
};

export const serializeEmployee = (employee) => {
  const source = typeof employee.toObject === "function" ? employee.toObject() : employee;
  return {
    ...source,
    leaveBalance: normalizeLeaveBalance(source.leaveBalance),
    profileCompletion: getProfileCompletion(source)
  };
};
