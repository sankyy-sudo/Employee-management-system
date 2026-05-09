const ROLE_LEVELS = [
  { pattern: /intern|trainee/i, title: "Intern", base: 180000, next: "Junior Developer" },
  { pattern: /junior|associate/i, title: "Junior Developer", base: 360000, next: "Mid Developer" },
  { pattern: /mid|software engineer|developer/i, title: "Mid Developer", base: 700000, next: "Senior Developer" },
  { pattern: /senior|lead/i, title: "Senior Developer", base: 1300000, next: "Tech Lead" },
  { pattern: /manager|architect|principal/i, title: "Tech Lead", base: 1800000, next: "Engineering Manager" }
];

const SKILL_WEIGHTS = {
  react: 55000,
  node: 55000,
  mongodb: 35000,
  express: 30000,
  python: 65000,
  ai: 90000,
  ml: 90000,
  devops: 80000,
  aws: 85000,
  docker: 50000,
  leadership: 90000
};

export const predictSalary = ({ experience = 0, skills = [], role = "", performanceRating = 3 }) => {
  const normalizedSkills = Array.isArray(skills)
    ? skills
    : String(skills).split(",").map((skill) => skill.trim());
  const roleInfo = ROLE_LEVELS.find((item) => item.pattern.test(role)) || ROLE_LEVELS[2];
  const skillValue = normalizedSkills.reduce((total, skill) => {
    const key = skill.toLowerCase();
    return total + (SKILL_WEIGHTS[key] || 18000);
  }, 0);
  const experienceValue = Number(experience || 0) * 95000;
  const performanceValue = Math.max(1, Math.min(5, Number(performanceRating || 3))) * 65000;
  const predicted = roleInfo.base + skillValue + experienceValue + performanceValue;

  return {
    currency: "INR",
    predictedSalary: Math.round(predicted),
    range: {
      min: Math.round(predicted * 0.9),
      max: Math.round(predicted * 1.12)
    },
    factors: {
      roleBase: roleInfo.base,
      skillValue,
      experienceValue,
      performanceValue
    }
  };
};

export const getCareerGrowth = ({ role = "", skills = [], completedTasks = 0, performanceRating = 3 }) => {
  const normalizedSkills = (Array.isArray(skills) ? skills : String(skills).split(","))
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
  const roleInfo = ROLE_LEVELS.find((item) => item.pattern.test(role)) || ROLE_LEVELS[1];
  const requiredSkills = ["react", "node", "mongodb", "system design", "leadership"];
  const missingSkills = requiredSkills.filter((skill) => !normalizedSkills.includes(skill));
  const taskScore = Math.min(35, Number(completedTasks || 0) * 2);
  const performanceScore = Math.min(35, Number(performanceRating || 3) * 7);
  const skillScore = Math.min(30, normalizedSkills.length * 5);
  const readiness = Math.min(100, taskScore + performanceScore + skillScore);

  return {
    currentRole: roleInfo.title,
    nextRole: roleInfo.next,
    promotionPath: ["Junior Developer", "Mid Developer", "Senior Developer", "Tech Lead", "Engineering Manager"],
    readiness,
    requiredSkills: missingSkills.slice(0, 4),
    recommendation:
      readiness >= 80
        ? "Ready for promotion discussion."
        : "Build the missing skills and complete higher-impact tasks before promotion review."
  };
};

export const analyzeMood = (moods) => {
  const lastSeven = moods.slice(0, 7);
  const stressedCount = lastSeven.filter((item) => ["stressed", "angry"].includes(item.mood)).length;

  return {
    totalEntries: moods.length,
    burnoutRisk: stressedCount >= 3 ? "high" : stressedCount >= 2 ? "medium" : "low",
    stressedDaysLastWeek: stressedCount,
    trend: lastSeven.map((item) => ({
      date: item.createdAt,
      mood: item.mood,
      score: item.score
    }))
  };
};
