import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosTestInstance from "../../../api/axiosTestInstance";

export const fetchTestData = createAsyncThunk(
  "test/fetchData",
  async ({ token, applicantId, attemptId }: any, thunkAPI) => {
    try {
      const res = await axiosTestInstance.get(
        `/applicant-questions/assigned/${applicantId}/${attemptId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      //Get the attempt count from response
      const attemptCount = res.data.attemptCount || 0;
      console.log("Current attempt count from API:", attemptCount);

      return {
        ...res.data,
        currentAttemptCount: attemptCount,
      };
    } catch (err: any) {
      console.error("Error in fetchTestData:", err);
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Unable to fetch test data"
      );
    }
  }
);

export const startTest = createAsyncThunk(
  "test/startTest",
  async ({ token, applicantId, attemptId }: any, thunkAPI) => {
    try {
      const res = await axiosTestInstance.post(
        `/applicant-questions/start-test/${applicantId}/${attemptId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const attemptCount = res.data.attemptCount || 0;

      // Check if maximum attempts exceeded
      if (attemptCount > 3) {
        throw new Error("MAXIMUM_ATTEMPTS_EXCEEDED");
      }

      return {
        ...res.data,
        currentAttemptCount: attemptCount,
      };
    } catch (err: any) {
      console.error("Error in startTest:", err);

      // Handle maximum attempts error specifically
      if (err.message === "MAXIMUM_ATTEMPTS_EXCEEDED") {
        return thunkAPI.rejectWithValue("MAXIMUM_ATTEMPTS_EXCEEDED");
      }

      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Unable to start test"
      );
    }
  }
);

export const submitAnswer = createAsyncThunk(
  "test/submitAnswer",
  async ({
    token,
    applicantId,
    attemptId,
    questionId,
    selectedOptionId,
  }: any) => {
    await axiosTestInstance.post(
      "/applicant-questions/answer",
      { applicantId, attemptId, questionId, selectedOptionId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { questionId };
  }
);

export const skipQuestion = createAsyncThunk(
  "test/skipQuestion",
  async ({ token, applicantId, attemptId, questionId }: any) => {
    await axiosTestInstance.patch(
      "/applicant-questions/skip",
      { applicantId, attemptId, questionId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { questionId };
  }
);

export const evaluateTest = createAsyncThunk(
  "test/evaluate",
  async ({ token, applicantId, attemptId }: any, thunkAPI) => {
    try {
      console.log("Evaluating test for:", { applicantId, attemptId });

      const res = await axiosTestInstance.get(
        `/applicant-questions/evaluate/${applicantId}/${attemptId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Evaluation response:", res.data);

      // Mark token as used only after successful evaluation
      try {
        await axiosTestInstance.post(
          "/test/mark-token-used",
          { token },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Token marked as used successfully");
      } catch (tokenError) {
        console.warn("Could not mark token as used:", tokenError);
      }

      return res.data;
    } catch (error: any) {
      console.error("Error in evaluateTest:", error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Error evaluating test"
      );
    }
  }
);
