import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchPayrollDashboard = createAsyncThunk("payroll/fetchDashboard", async () => {
  const { data } = await api.get("/payrolls");
  const history = data || [];
  return { latest: history[0] || null, history };
});

export const fetchMyPayrollDashboard = createAsyncThunk("payroll/fetchMyDashboard", async () => {
  const { data } = await api.get("/payrolls/me");
  const history = data || [];
  return { latest: history[0] || null, history };
});

export const generatePayroll = createAsyncThunk("payroll/generate", async (payload, { dispatch }) => {
  await api.post("/payrolls", payload);
  return dispatch(fetchPayrollDashboard()).unwrap();
});

const payrollSlice = createSlice({
  name: "payroll",
  initialState: { latest: null, history: [], loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayrollDashboard.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchPayrollDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.latest = action.payload.latest;
        state.history = action.payload.history;
      })
      .addCase(fetchPayrollDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load payroll";
      })
      .addCase(fetchMyPayrollDashboard.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchMyPayrollDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.latest = action.payload.latest;
        state.history = action.payload.history;
      })
      .addCase(fetchMyPayrollDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load payroll";
      });
  }
});

export default payrollSlice.reducer;
