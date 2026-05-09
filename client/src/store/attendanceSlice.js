import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchAttendanceDashboard = createAsyncThunk("attendance/fetchDashboard", async () => {
  const [historyRes, summaryRes] = await Promise.all([
    api.get("/attendance"),
    api.get("/attendance/summary")
  ]);
  const today = historyRes.data?.[0] || null;
  return { today, history: historyRes.data || [], summary: summaryRes.data || null };
});

export const markAttendance = createAsyncThunk("attendance/mark", async (action, { dispatch }) => {
  await api.post("/attendance", { action });
  return dispatch(fetchAttendanceDashboard()).unwrap();
});

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: { today: null, history: [], summary: null, loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceDashboard.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchAttendanceDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.today = action.payload.today;
        state.history = action.payload.history;
        state.summary = action.payload.summary;
      })
      .addCase(fetchAttendanceDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load attendance";
      });
  }
});

export default attendanceSlice.reducer;
