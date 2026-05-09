import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchAdminAnalytics = createAsyncThunk("analytics/fetchAdmin", async () => {
  const [summaryRes, monthlyRes, moodRes] = await Promise.all([
    api.get("/dashboard/summary"),
    api.get("/reports/monthly"),
    api.get("/moods")
  ]);
  return {
    summary: summaryRes.data,
    monthlyReport: monthlyRes.data,
    moods: moodRes.data || []
  };
});

const analyticsSlice = createSlice({
  name: "analytics",
  initialState: { summary: null, monthlyReport: null, moods: [], loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload.summary;
        state.monthlyReport = action.payload.monthlyReport;
        state.moods = action.payload.moods;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load analytics";
      });
  }
});

export default analyticsSlice.reducer;
