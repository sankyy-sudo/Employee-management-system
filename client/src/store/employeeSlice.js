import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchEmployees = createAsyncThunk("employees/fetch", async () => {
  const { data } = await api.get("/employees");
  return data || [];
});

export const saveEmployee = createAsyncThunk("employees/save", async (payload, { dispatch }) => {
  const body = { ...payload };
  if (!body.password) {
    delete body.password;
  }

  if (payload._id) {
    await api.put(`/employees/${payload._id}`, body);
  } else {
    await api.post("/employees", body);
  }
  return dispatch(fetchEmployees()).unwrap();
});

export const deleteEmployee = createAsyncThunk("employees/delete", async (id, { dispatch }) => {
  await api.delete(`/employees/${id}`);
  return dispatch(fetchEmployees()).unwrap();
});

const employeeSlice = createSlice({
  name: "employees",
  initialState: { items: [], loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load employees";
      });
  }
});

export default employeeSlice.reducer;
