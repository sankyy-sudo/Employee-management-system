import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchLeaveDashboard = createAsyncThunk("leave/fetchDashboard", async () => {
  const [balanceRes, historyRes] = await Promise.all([
    api.get("/leaves/balance"),
    api.get("/leaves")
  ]);
  return {
    balance: balanceRes.data?.leaveBalance || {},
    history: historyRes.data || []
  };
});

export const applyLeave = createAsyncThunk("leave/apply", async (payload, { dispatch }) => {
  await api.post("/leaves", payload);
  return dispatch(fetchLeaveDashboard()).unwrap();
});

export const updateLeaveStatus = createAsyncThunk("leave/updateStatus", async ({ id, status }, { dispatch }) => {
  await api.patch(`/leaves/${id}/status`, { status });
  return dispatch(fetchLeaveDashboard()).unwrap();
});

const leaveSlice = createSlice({
  name: "leave",
  initialState: { balance: {}, history: [], loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaveDashboard.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchLeaveDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.history = action.payload.history;
      })
      .addCase(fetchLeaveDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load leave data";
      });
  }
});

export default leaveSlice.reducer;
