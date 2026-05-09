import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import attendanceReducer from "./attendanceSlice";
import analyticsReducer from "./analyticsSlice";
import employeeReducer from "./employeeSlice";
import leaveReducer from "./leaveSlice";
import moodReducer from "./moodSlice";
import notificationReducer from "./notificationSlice";
import payrollReducer from "./payrollSlice";
import taskReducer from "./taskSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    payroll: payrollReducer,
    tasks: taskReducer,
    mood: moodReducer,
    analytics: analyticsReducer,
    notifications: notificationReducer
  }
});
