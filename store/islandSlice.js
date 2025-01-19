import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  islandOwner: '',
  islandId: '',
  islandName: '',
  playlist: [],
  currentVideo: null,
  timestamp: null,
  isPlaying: false,
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
    setPlaylist(state, action) {
      state.playlist = action.payload;
    },
    setCurrentVideo(state, action) {
      state.currentVideo = action.payload.video;
      state.timestamp = action.payload.timestamp;
    },
    setPlayPause(state) {
      state.isPlaying = !state.isPlaying;
    },
    setIsLoading(state, action) {
      state.isLoading = action.payload;
    },
    clearIsland() {
      return initialState;
    },
  },
});

export const {
  setIslandOwner,
  setIslandId,
  setIslandName,
  setPlaylist,
  setCurrentVideo,
  setPlayPause,
  setIsLoading,
  clearIsland,
} = islandSlice.actions;
export default islandSlice.reducer;
