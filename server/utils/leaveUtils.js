import Holiday from "../models/Holiday.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getInclusiveDates = (startDate, endDate) => {
  const dates = [];
  const cursor = normalizeDate(startDate);
  const finalDate = normalizeDate(endDate);

  while (cursor <= finalDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export const getHolidayDatesInRange = async (startDate, endDate) => {
  const holidays = await Holiday.find({
    date: {
      $gte: normalizeDate(startDate),
      $lte: normalizeDate(endDate)
    }
  }).select("date");

  return holidays.map((holiday) => normalizeDate(holiday.date));
};

export const calculateLeaveDays = async (startDate, endDate) => {
  const requestedDates = getInclusiveDates(startDate, endDate);
  const holidayDates = await getHolidayDatesInRange(startDate, endDate);
  const holidaySet = new Set(holidayDates.map((date) => date.getTime()));
  const effectiveDates = requestedDates.filter((date) => !holidaySet.has(date.getTime()));

  return {
    totalDays: Math.round((normalizeDate(endDate) - normalizeDate(startDate)) / MS_PER_DAY) + 1,
    days: effectiveDates.length,
    holidayDates
  };
};
