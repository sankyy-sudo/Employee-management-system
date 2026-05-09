import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchMoodAnalytics = createAsyncThunk("mood/fetchAnalytics", async () => {
  const { data } = await api.get("/moods/analytics");
  return data;
});

export const submitMood = createAsyncThunk("mood/submit", async (payload, { dispatch }) => {
  await api.post("/moods", payload);
  return dispatch(fetchMoodAnalytics()).unwrap();
});

const moodSlice = createSlice({
  name: "mood",
  initialState: { analytics: null, loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMoodAnalytics.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchMoodAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchMoodAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Unable to load mood analytics";
      });
  }
});

export default moodSlice.reducer;
