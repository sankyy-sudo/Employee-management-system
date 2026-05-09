import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken")
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || state.refreshToken;
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
    }
  }
});

export const { clearCredentials, setCredentials } = authSlice.actions;
export default authSlice.reducer;
