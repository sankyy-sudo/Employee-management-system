import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchTasks = createAsyncThunk("tasks/fetch", async () => {
  const { data } = await api.get("/tasks");
  return data || [];
});

export const createTask = createAsyncThunk("tasks/create", async (payload, { dispatch }) => {
  await api.post("/tasks", payload);
  return dispatch(fetchTasks()).unwrap();
});

const taskSlice = createSlice({
  name: "tasks",
  initialState: { items: [], loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load tasks";
      });
  }
});

export default taskSlice.reducer;
