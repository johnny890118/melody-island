import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  islandOwner: '',
  islandId: '',
  islandName: '',
  isLoading: false,
};

const islandSlice = createSlice({
  name: 'island',
  initialState,
  reducers: {
    setIslandOwner(state, action) {
      state.islandOwner = action.payload;
    },
    setIslandId(state, action) {
      state.islandId = action.payload;
    },
    setIslandName(state, action) {
      state.islandName = action.payload;
    },
    setIsLoading(state, action) {
      state.isLoading = action.payload;
    },
    clearIsland() {
      return initialState;
    },
  },
});

export const { setIslandOwner, setIslandId, setIslandName, setIsLoading, clearIsland } =
  islandSlice.actions;
export default islandSlice.reducer;
