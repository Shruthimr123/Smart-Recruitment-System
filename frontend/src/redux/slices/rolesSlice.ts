import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

interface Role {
  id: string;
  name: string;
}

interface RoleState {
  roles: Role[];
  loading: boolean;
  error: string | null;
}

const initialState: RoleState = {
  roles: [],
  loading: false,
  error: null,
};

export const fetchRoles = createAsyncThunk(
  "roles/fetchAll",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/roles");

      const filteredRoles = response.data.data.filter((role: Role) => role.name !== "super admin");
      return filteredRoles;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Error fetching roles"
      );
    }
  }
);

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    clearRolesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearRolesError } = rolesSlice.actions;
export default rolesSlice.reducer;