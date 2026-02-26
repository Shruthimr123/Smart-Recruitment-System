import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./ProctorApp.css";
import WebcamCapture from "./WebcamCapture";
import ProctorModal from "./ProctorModal";
 
import {
  setAlertMessage,
  setIsTestCompleted,
  setVerificationComplete,
} from "../../../redux/slices/proctorSlice";
 
import { type RootState } from "../../../redux/store";
import { MALPRACTICE_LIMITS } from "../../../constants/proctorConstants";
 
type MyComponentProps = {
  handleFinalSubmit: () => Promise<void>;
  onVerificationComplete: () => void;
};
 
const ProctorApp: React.FC<MyComponentProps> = ({
  handleFinalSubmit,
  onVerificationComplete,
}) => {
  const dispatch = useDispatch();
  const hasSubmittedRef = useRef(false);
 
  const {
    isTestStarted,
    isTestCompleted,
    malpracticeCount,
    verificationComplete,
  } = useSelector((state: RootState) => state.proctor);
 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProctorModal, setShowProctorModal] = useState(false);
 
  const applicantId = localStorage.getItem("applicantId") || "";
  const token = localStorage.getItem("token") || undefined;
 
  useEffect(() => {
    if (!isTestStarted && !verificationComplete && applicantId) {
      setShowProctorModal(true);
    }
  }, [isTestStarted, verificationComplete, applicantId]);
 
  const handleVerificationComplete = (): void => {
    dispatch(setVerificationComplete(true));
    dispatch(
      setAlertMessage("✅ Verification complete - Ready to start test!"),
    );
    setShowProctorModal(false);
    onVerificationComplete();
  };
 
  const triggerAutoSubmit = async (): Promise<void> => {
    if (hasSubmittedRef.current || isSubmitting) {
      console.log("Submission already in progress or completed");
      return;
    }
 
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
 
    try {
      dispatch(
        setAlertMessage("❌ Test terminated due to multiple malpractices."),
      );
      dispatch(setIsTestCompleted(true));
 
      console.log("Triggering auto-submit due to malpractice limit");
      await handleFinalSubmit();
 
      console.log("Auto-submit completed successfully");
    } catch (error) {
      console.error("Error during auto-submit:", error);
      hasSubmittedRef.current = false;
      setIsSubmitting(false);
    }
  };
 
  const handleMalpracticeDetected = (message: string): void => {
    console.log(`Malpractice detected: ${message}`);
  };
 
  useEffect(() => {
    if (
      isTestStarted &&
      malpracticeCount >= MALPRACTICE_LIMITS.MAX_COUNT &&
      !isSubmitting &&
      !hasSubmittedRef.current &&
      !isTestCompleted
    ) {
      console.log("Malpractice limit reached, triggering auto-submit");
      triggerAutoSubmit();
    }
  }, [malpracticeCount, isTestStarted, isSubmitting, isTestCompleted]);
 
  const handleModalClose = () => {
    if (!isTestStarted && !verificationComplete) {
      return;
    }
    setShowProctorModal(false);
  };
 
  return (
    <div>
      <div className="main-content">
        {/* Only show WebcamCapture after verification and test started */}
        {verificationComplete && isTestStarted && !isTestCompleted && (
          <WebcamCapture
            onMalpracticeDetected={handleMalpracticeDetected}
            isTestStarted={isTestStarted}
            isTestCompleted={isTestCompleted || hasSubmittedRef.current}
            onVerificationComplete={handleVerificationComplete}
            applicantId={applicantId}
          />
        )}
      </div>
 
      {/* Proctor Modal for initial verification */}
      <ProctorModal
        isOpen={showProctorModal}
        onClose={handleModalClose}
        onVerificationSuccess={handleVerificationComplete}
        applicantId={applicantId}
        token={token}
      />
    </div>
  );
};
 
export default ProctorApp;
 