import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ProctorState {
  capturedImage: string | null;
  alertMessage: string;
  isTestStarted: boolean;
  isTestCompleted: boolean;
  malpracticeCount: number;
  verificationComplete: boolean;
  currentApplicantId: string | null; 
}

const initialState: ProctorState = {
  capturedImage: null,
  alertMessage: "",
  isTestStarted: false,
  isTestCompleted: false,
  malpracticeCount: 0,
  verificationComplete: false,
  currentApplicantId: null,
};

const proctorSlice = createSlice({
  name: "proctor",
  initialState,
  reducers: {
    setCapturedImage(state, action: PayloadAction<string | null>) {
      state.capturedImage = action.payload;
    },
    setAlertMessage(state, action: PayloadAction<string>) {
      state.alertMessage = action.payload;
    },
    setIsTestStarted(state, action: PayloadAction<boolean>) {
      state.isTestStarted = action.payload;
    },
    setIsTestCompleted(state, action: PayloadAction<boolean>) {
      state.isTestCompleted = action.payload;
    },
    setMalpracticeCount(state, action: PayloadAction<number>) {
      state.malpracticeCount = action.payload;
    },
    incrementMalpractice(state) {
      if (state.malpracticeCount < 7) {
        state.malpracticeCount += 1;
      }
    },
    setVerificationComplete(state, action: PayloadAction<boolean>) {
      state.verificationComplete = action.payload;
    },
    resetProctorState(state) {
      state.capturedImage = null;
      state.alertMessage = "";
      state.isTestStarted = false;
      state.isTestCompleted = false;
      state.malpracticeCount = 0;
      state.verificationComplete = false;
    },
    setCurrentApplicantId(state, action: PayloadAction<string>) {
      // If applicant ID changed, reset relevant state
      if (state.currentApplicantId !== action.payload) {
        state.malpracticeCount = 0;
        state.verificationComplete = false;
        state.capturedImage = null;
        state.isTestStarted = false;
        state.isTestCompleted = false;
      }
      state.currentApplicantId = action.payload;
    },
  },
});

export const {
  setCapturedImage,
  setAlertMessage,
  setIsTestStarted,
  setIsTestCompleted,
  setMalpracticeCount,
  incrementMalpractice,
  setVerificationComplete,
  resetProctorState,
  setCurrentApplicantId,
} = proctorSlice.actions;

export default proctorSlice.reducer;