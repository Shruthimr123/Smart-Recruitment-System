import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Webcam from "react-webcam";
import { type RootState } from "../../../redux/store";
import "./WebcamCapture.css";
 
import axiosProctorInstance from "../../../api/axiosProctorInstance";
import axiosTestInstance from "../../../api/axiosTestInstance";
import {
  setAlertMessage,
  setIsTestStarted,
  setMalpracticeCount,
} from "../../../redux/slices/proctorSlice";
import {
  SIMILARITY_THRESHOLDS,
  MALPRACTICE_LIMITS,
} from "../../../constants/proctorConstants";
 
import { Camera } from "lucide-react";
 
interface WebcamCaptureProps {
  onMalpracticeDetected: (message: string) => void;
  isTestStarted: boolean;
  isTestCompleted: boolean;
  onVerificationComplete: () => void;
  applicantId: string;
}
 
interface LiveVerificationResponse {
  success?: boolean;
  verified?: boolean;
  status?:
    | "verified"
    | "multiple_faces"
    | "no_face"
    | "mismatch"
    | "detection_error";
  similarity?: number;
  verificationImageUrl?: string;
}
 
const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onMalpracticeDetected,
  isTestStarted,
  isTestCompleted,
  applicantId,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const dispatch = useDispatch();
 
  // Detection loop control
  const detectionActiveRef = useRef<boolean>(false);
 
  // Refs for current state
  const isTestStartedRef = useRef<boolean>(false);
  const isTestCompletedRef = useRef<boolean>(false);
  const malpracticeCountRef = useRef<number>(0);
 
  const [cameraReady, setCameraReady] = useState<boolean>(false);
 
  const malpracticeCount = useSelector(
    (state: RootState) => state.proctor.malpracticeCount,
  );
 
  // Update refs when state changes
  useEffect(() => {
    isTestStartedRef.current = isTestStarted;
    isTestCompletedRef.current = isTestCompleted;
    malpracticeCountRef.current = malpracticeCount;
  }, [isTestStarted, isTestCompleted, malpracticeCount]);
 
  // Start/stop detection loop based on test state
  useEffect(() => {
    console.log(
      "🔄 Detection loop control - isTestStarted:",
      isTestStarted,
      "isTestCompleted:",
      isTestCompleted,
      "cameraReady:",
      cameraReady,
    );
 
    if (isTestStarted && !isTestCompleted && cameraReady) {
      // Start detection loop if not already running
      if (!detectionActiveRef.current) {
        console.log("🚀 Starting detection loop");
        detectionActiveRef.current = true;
        startDetectionLoop();
      }
    } else {
      // Stop detection loop
      if (detectionActiveRef.current) {
        console.log("🛑 Stopping detection loop");
        detectionActiveRef.current = false;
      }
    }
  }, [isTestStarted, isTestCompleted, cameraReady]);
 
  // Clean up on unmount
  useEffect(() => {
    return () => {
      detectionActiveRef.current = false;
      console.log("🧹 Cleanup - detection loop stopped");
    };
  }, []);
 
  const startDetectionLoop = async () => {
    // Run the loop while active
    while (detectionActiveRef.current) {
      // Check if we should still be running
      if (!isTestStartedRef.current || isTestCompletedRef.current) {
        console.log("⏸️ Test state changed, exiting loop");
        detectionActiveRef.current = false;
        break;
      }
 
      // Check if we've reached max violations
      if (malpracticeCountRef.current >= MALPRACTICE_LIMITS.MAX_COUNT) {
        console.log("⚠️ Max violations reached, stopping detection loop");
        detectionActiveRef.current = false;
        break;
      }
 
      // Perform one detection cycle
      await performLiveDetection();
 
      // Wait 3 seconds before next detection
      if (detectionActiveRef.current) {
        await wait(3000);
      }
    }
  };
 
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
 
  const performLiveDetection = async (): Promise<void> => {
    // Quick checks before starting
    if (!webcamRef.current || !webcamRef.current.video?.readyState) {
      console.log("📷 Webcam not ready");
      return;
    }
 
    if (!cameraReady) {
      console.log("📷 Camera not ready");
      return;
    }
 
    try {
      console.log("📸 Capturing frame for live detection...");
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        console.log("❌ Failed to capture screenshot");
        return;
      }
 
      const blob = await (await fetch(imageSrc)).blob();
      const file = new File([blob], "live.jpg", { type: blob.type });
 
      // Get embedding from Python service
      const pythonFormData = new FormData();
      pythonFormData.append("file", file);
      pythonFormData.append("applicant_id", applicantId);
 
      console.log("🔍 Getting embedding from Python service...");
      const embeddingResponse = await axiosProctorInstance.post(
        "/register-with-embedding",
        pythonFormData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
 
      console.log("📊 Embedding response:", embeddingResponse.data);
 
      // Handle different statuses from Python service
      const pythonStatus = embeddingResponse.data.status;
 
      // If no face detected by Python service, trigger violation
      if (pythonStatus === "no_face" || pythonStatus === "face_not_detected") {
        console.log("🚫 No face detected by Python service!");
        await handleViolation("Face not detected", file);
        return;
      }
 
      if (pythonStatus === "multiple_faces") {
        console.log("👥 Multiple faces detected by Python service!");
        await handleViolation("Multiple faces detected", file);
        return;
      }
 
      if (pythonStatus !== "success") {
        console.log("❌ Python detection error:", pythonStatus);
        dispatch(setAlertMessage(`⚠️ ${pythonStatus.replace(/_/g, " ")}`));
        return;
      }
 
      const embedding = embeddingResponse.data.embedding;
 
      // Verify against stored embedding
      const verifyFormData = new FormData();
      verifyFormData.append("file", file);
      verifyFormData.append("applicantId", applicantId);
      verifyFormData.append("embedding", JSON.stringify(embedding));
 
      console.log("🔐 Verifying against stored embedding...");
      const verifyResponse =
        await axiosTestInstance.post<LiveVerificationResponse>(
          "/malpractice/verify-candidate",
          verifyFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );
 
      console.log("📊 Verification response:", verifyResponse.data);
 
      // Extract values with defaults
      const verified = verifyResponse.data.verified === true;
      const status = verifyResponse.data.status;
      const similarity = verifyResponse.data.similarity || 0;
 
      // CASE 1: Multiple faces detected
      if (status === "multiple_faces") {
        console.log("⚠️ Multiple faces detected!");
        await handleViolation("Multiple faces detected", file);
      }
      // CASE 2: No face detected
      else if (status === "no_face") {
        console.log("⚠️ No face detected!");
        await handleViolation("Face not detected", file);
      }
      // CASE 3: Explicit mismatch status
      else if (status === "mismatch") {
        console.log(`⚠️ Face mismatch (explicit status)!`);
        await handleViolation("Face mismatch detected", file);
      }
      // CASE 4: Verified true
      else if (verified) {
        console.log(`✅ Face verified: ${similarity}`);
 
        if (similarity < SIMILARITY_THRESHOLDS.LIVE_PROCTORING) {
          console.log(
            `⚠️ Similarity too low: ${similarity} < ${SIMILARITY_THRESHOLDS.LIVE_PROCTORING}`,
          );
          await handleViolation("Face mismatch detected", file);
        }
      }
      // CASE 5: Verified is false
      else if (!verified) {
        console.log(
          `⚠️ Face mismatch (verified=false) - similarity: ${similarity}`,
        );
        await handleViolation("Face mismatch detected", file);
      }
      // CASE 6: Any other case
      else {
        console.log(`⚠️ Verification failed:`, verifyResponse.data);
        dispatch(setAlertMessage("⚠️ Verification error"));
      }
    } catch (error) {
      console.error("❌ Live detection error:", error);
      dispatch(setAlertMessage("⚠️ Detection error"));
    }
  };
 
  const handleViolation = async (
    message: string,
    file: File,
  ): Promise<void> => {
    // Check if we've already reached the limit
    if (malpracticeCountRef.current >= MALPRACTICE_LIMITS.MAX_COUNT) {
      console.log("⚠️ Already at max violations, not incrementing further");
      return;
    }
 
    try {
      // Upload violation image and get updated count from backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alertMessage", message);
      formData.append("applicantId", applicantId);
 
      const response = await axios.post<{
        success: boolean;
        totalViolations: number;
        isBlocked: boolean;
        maxReached: boolean;
      }>("http://localhost:3000/malpractice/alert", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
 
      // Show alert FIRST
      dispatch(setAlertMessage(`⚠️ ${message}`));
 
      // THEN set the violation count from backend response
      dispatch(setMalpracticeCount(response.data.totalViolations));
 
      console.log(
        `🔴 Violation: ${message}. Count: ${response.data.totalViolations}/${MALPRACTICE_LIMITS.MAX_COUNT}`,
      );
 
      // If applicant is now blocked, terminate immediately
      if (response.data.isBlocked) {
        dispatch(
          setAlertMessage("❌ Maximum violations reached. Test terminated."),
        );
        dispatch(setIsTestStarted(false));
 
        // Dispatch block event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("applicant-blocked"));
        }
      }
 
      onMalpracticeDetected(message);
    } catch (error) {
      console.error("Error in violation handler:", error);
      dispatch(setAlertMessage("⚠️ Failed to report violation"));
    }
  };
 
  const handleUserMedia = (): void => {
    console.log("✅ Webcam ready for live proctoring");
    setCameraReady(true);
    dispatch(setAlertMessage("✅ Live proctoring active"));
  };
 
  const handleUserMediaError = (): void => {
    console.error("❌ Webcam error");
    setCameraReady(false);
    dispatch(setAlertMessage("🚫 Camera access denied"));
  };
 
  // Get border class based on malpractice count
  const getBorderClass = (): string => {
    if (malpracticeCount >= MALPRACTICE_LIMITS.MAX_COUNT) {
      return "webcam-live-border-critical";
    }
    if (malpracticeCount >= 5) {
      return "webcam-live-border-warning";
    }
    if (malpracticeCount >= 3) {
      return "webcam-live-border-caution";
    }
    return "webcam-live-border-normal";
  };
 
  return (
    <div className="webcam-live-container">
      <div className={`webcam-live-wrapper ${getBorderClass()}`}>
        {/* Violation counter at top */}
        <div className="violation-counter">
          <span className="violation-label">Violations</span>
          <span
            className={`violation-count ${malpracticeCount >= 5 ? "high" : malpracticeCount >= 3 ? "medium" : "low"}`}
          >
            {malpracticeCount}/{MALPRACTICE_LIMITS.MAX_COUNT}
          </span>
        </div>
 
        {/* Webcam feed */}
        <Webcam
          ref={webcamRef}
          className={`webcam-live-feed ${cameraReady ? "show" : "hide"}`}
          screenshotFormat="image/jpeg"
          width={240}
          height={180}
          videoConstraints={{
            width: 240,
            height: 180,
            facingMode: "user",
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          mirrored={true}
        />
 
        {!cameraReady && (
          <div className="webcam-live-placeholder">
            <Camera size={32} />
            <p>Initializing camera...</p>
          </div>
        )}
 
        {/* Small indicator for proctoring status */}
        {cameraReady && isTestStarted && (
          <div className="proctoring-indicator">
            <span className="indicator-dot live"></span>
            <span className="indicator-text">Live</span>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default WebcamCapture;
 
 