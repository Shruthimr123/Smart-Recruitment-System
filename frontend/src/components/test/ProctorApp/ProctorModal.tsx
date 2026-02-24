import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import './ProctorModal.css';
import axiosProctorInstance from '../../../api/axiosProctorInstance';
import axiosTestInstance from '../../../api/axiosTestInstance';
import { setCapturedImage, setVerificationComplete } from '../../../redux/slices/proctorSlice';
import { SIMILARITY_THRESHOLDS, FACE_REQUIREMENTS } from '../../../constants/proctorConstants';

interface ProctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: () => void;
  applicantId: string;
  token?: string;
}

// Strict state machine - only one state at a time
type ModalState = 
  | 'idle'              // Camera active, no capture yet
  | 'captured'           // Image captured, ready for action
  | 'registering'        // First attempt - registering
  | 'verifying'          // Subsequent attempt - verifying
  | 'success'            // Verification successful
  | 'mismatch';          // Verification failed

type DetectionStatus = 'no_face' | 'multiple_faces' | 'face_too_far' | 'face_ready' | 'detecting';

interface FaceDetectionResult {
  status: DetectionStatus;
  coverage?: number;
  x_offset?: number;
  y_offset?: number;
  message: string;
}

const ProctorModal: React.FC<ProctorModalProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  applicantId,
  token,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const dispatch = useDispatch();
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State machine
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [message, setMessage] = useState<string>('');
  const [capturedImage, setCapturedImageState] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<FaceDetectionResult>({
    status: 'detecting',
    message: 'Initializing camera...'
  });

  // Check if applicant already has registered face
  useEffect(() => {
    if (isOpen && applicantId) {
      checkExistingRegistration();
    }
  }, [isOpen, applicantId]);

  const checkExistingRegistration = async () => {
    try {
      // This would ideally check with backend, but for now we'll determine during verification
      setIsExistingProfile(false);
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  // Start passive face detection
  const startPassiveDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video?.readyState || capturedImage) {
        return;
      }

      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'detection.jpg', { type: blob.type });

        const formData = new FormData();
        formData.append('file', file);

        const res = await axiosProctorInstance.post('/detect/passive', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        updateFaceDetectionStatus(res.data);
      } catch (error) {
        console.error('Passive detection error:', error);
      }
    }, 1000);
  }, [capturedImage]);

  // Update face detection status based on API response
  const updateFaceDetectionStatus = (data: any) => {
    let detectionStatus: DetectionStatus;
    let detectionMessage: string;

    switch (data.status) {
      case 'face_detected':
        const coverage = data.coverage || 0;
        const xOffset = data.x_offset || 100;
        const yOffset = data.y_offset || 100;

        if (coverage < FACE_REQUIREMENTS.MIN_COVERAGE) {
          detectionStatus = 'face_too_far';
          detectionMessage = 'Face is too far. Move closer.';
        } else if (xOffset > FACE_REQUIREMENTS.MAX_X_OFFSET || yOffset > FACE_REQUIREMENTS.MAX_Y_OFFSET) {
          detectionStatus = 'face_too_far';
          detectionMessage = 'Center your face in the circle';
        } else {
          detectionStatus = 'face_ready';
          detectionMessage = 'Ready to capture';
        }
        break;

      case 'multiple_faces':
        detectionStatus = 'multiple_faces';
        detectionMessage = 'Multiple faces detected';
        break;

      case 'no_face':
        detectionStatus = 'no_face';
        detectionMessage = 'Face not detected';
        break;

      default:
        detectionStatus = 'detecting';
        detectionMessage = 'Detecting face...';
    }

    setFaceDetection({
      status: detectionStatus,
      coverage: data.coverage,
      x_offset: data.x_offset,
      y_offset: data.y_offset,
      message: detectionMessage,
    });
  };

  // Check if capture should be enabled
  const isCaptureEnabled = useCallback(() => {
    return cameraReady && 
           faceDetection.status === 'face_ready' && 
           !isLoading && 
           modalState === 'idle';
  }, [cameraReady, faceDetection.status, isLoading, modalState]);

  useEffect(() => {
    if (isOpen && cameraReady && !capturedImage && modalState === 'idle') {
      startPassiveDetection();
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isOpen, cameraReady, capturedImage, modalState, startPassiveDetection]);

  const handleUserMedia = () => {
    setCameraReady(true);
    setFaceDetection({
      status: 'detecting',
      message: 'Detecting face...'
    });
  };

  const handleUserMediaError = () => {
    setCameraReady(false);
    setFaceDetection({
      status: 'detecting',
      message: 'Camera access denied'
    });
  };

  const captureImage = async () => {
    if (!webcamRef.current || !cameraReady || !isCaptureEnabled()) {
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setMessage('Failed to capture image');
      return;
    }

    setCapturedImageState(imageSrc);
    setModalState('captured');
    setMessage('Image captured');
    setVerificationError(null);

    // Stop detection while showing captured image
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  };

  const recaptureImage = () => {
    setCapturedImageState(null);
    setModalState('idle');
    setMessage('');
    setSimilarity(null);
    setVerificationError(null);
    setIsExistingProfile(false);
    startPassiveDetection();
  };

  const verifyIdentity = async () => {
    if (!capturedImage || !applicantId) {
      setVerificationError('No image captured');
      return;
    }

    setIsLoading(true);
    setVerificationError(null);

    try {
      // Convert base64 to blob
      const blob = await (await fetch(capturedImage)).blob();
      const file = new File([blob], 'verification.jpg', { type: blob.type });

      // Get embedding from Python service
      const pythonFormData = new FormData();
      pythonFormData.append('file', file);
      pythonFormData.append('applicant_id', applicantId);

      const embeddingResponse = await axiosProctorInstance.post(
        '/register-with-embedding',
        pythonFormData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (embeddingResponse.data.status !== 'success') {
        throw new Error(embeddingResponse.data.status);
      }

      const embedding = embeddingResponse.data.embedding;

      // Try to register with NestJS backend
      const registerFormData = new FormData();
      registerFormData.append('file', file);
      registerFormData.append('applicantId', applicantId);
      registerFormData.append('embedding', JSON.stringify(embedding));

      const config = token ? {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      } : {};

      const registerResponse = await axiosTestInstance.post(
        '/malpractice/register-candidate',
        registerFormData,
        config
      );

      if (registerResponse.data.isExisting) {
        // This is an existing user - verify
        setIsExistingProfile(true);
        setModalState('verifying');
        setMessage('Verifying identity...');
        
        const verifyFormData = new FormData();
        verifyFormData.append('file', file);
        verifyFormData.append('applicantId', applicantId);
        verifyFormData.append('embedding', JSON.stringify(embedding));

        const verifyResponse = await axiosTestInstance.post(
          '/malpractice/verify-candidate',
          verifyFormData,
          config
        );

        const similarityScore = verifyResponse.data.similarity;
        setSimilarity(similarityScore);
        
        if (verifyResponse.data.verified && similarityScore >= SIMILARITY_THRESHOLDS.PRE_TEST_VERIFICATION) {
          setModalState('success');
          setMessage(`Identity verified successfully! (${Math.round(similarityScore * 100)}% match)`);
          
          dispatch(setCapturedImage(registerResponse.data.profileImageUrl));
          dispatch(setVerificationComplete(true));
          
          setTimeout(() => {
            onVerificationSuccess();
          }, 1500);
        } else {
          setModalState('mismatch');
          setVerificationError(`Identity mismatch (${Math.round(similarityScore * 100)}% match)`);
        }
      } else {
        // First time registration
        setIsExistingProfile(false);
        setModalState('registering');
        setMessage('Registering identity...');
        
        setModalState('success');
        setMessage('Identity registered successfully!');
        
        dispatch(setCapturedImage(registerResponse.data.profileImageUrl));
        dispatch(setVerificationComplete(true));
        
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setModalState('mismatch');
      setVerificationError(error.response?.data?.message || error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setModalState('idle');
    setCapturedImageState(null);
    setMessage('');
    setSimilarity(null);
    setVerificationError(null);
    setIsExistingProfile(false);
    setFaceDetection({
      status: 'detecting',
      message: 'Detecting face...'
    });
    startPassiveDetection();
  };

  const getStatusIcon = () => {
    switch (modalState) {
      case 'success':
        return <CheckCircle className="status-icon success" />;
      case 'mismatch':
        return <XCircle className="status-icon error" />;
      case 'registering':
      case 'verifying':
        return <Loader2 className="status-icon spinning" />;
      default:
        return <Camera className="status-icon idle" />;
    }
  };

  // Get border class based on face detection
  const getWebcamBorderClass = () => {
    if (!cameraReady) return 'webcam-border-default';
    if (capturedImage) return 'webcam-border-captured';
    
    switch (faceDetection.status) {
      case 'face_ready':
        return 'webcam-border-ready';
      case 'face_too_far':
        return 'webcam-border-warning';
      case 'multiple_faces':
        return 'webcam-border-multiple';
      case 'no_face':
        return 'webcam-border-error';
      default:
        return 'webcam-border-default';
    }
  };

  // Determine which buttons to show based on state
  const renderButtons = () => {
    // Only Retry button on mismatch
    if (modalState === 'mismatch') {
      return (
        <button
          className="modal-button retry-button"
          onClick={resetModal}
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      );
    }

    // No buttons on success
    if (modalState === 'success') {
      return null;
    }

    // Loading states - show nothing
    if (modalState === 'registering' || modalState === 'verifying') {
      return null;
    }

    // Idle state - show Capture button only
    if (modalState === 'idle') {
      return (
        <button
          className={`modal-button capture-button ${isCaptureEnabled() ? 'active' : 'disabled'}`}
          onClick={captureImage}
          disabled={!isCaptureEnabled()}
        >
          <Camera size={18} />
          Capture
        </button>
      );
    }

    // Captured state - show Recapture and Verify/Register buttons
    if (modalState === 'captured') {
      return (
        <>
          <button
            className="modal-button recapture-button"
            onClick={recaptureImage}
            disabled={isLoading}
          >
            <RefreshCw size={18} />
            Recapture
          </button>

          <button
            className="modal-button verify-button"
            onClick={verifyIdentity}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="spinning" size={18} />
                {isExistingProfile ? 'Verifying...' : 'Registering...'}
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                {isExistingProfile ? 'Verify Identity' : 'Register & Verify'}
              </>
            )}
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="proctor-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="proctor-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="proctor-modal-header">
              <h2>Proctor Verification</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="proctor-modal-content">
              <div className="webcam-section">
                <div className={`webcam-circle-frame ${getWebcamBorderClass()}`}>
                  {!capturedImage ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                          width: 320,
                          height: 320,
                          facingMode: 'user',
                        }}
                        onUserMedia={handleUserMedia}
                        onUserMediaError={handleUserMediaError}
                        className={`webcam-circle ${cameraReady ? 'show' : 'hide'}`}
                      />
                      {!cameraReady && (
                        <div className="webcam-placeholder-circle">
                          <Camera size={48} />
                          <p>Loading camera...</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="captured-image-circle" 
                    />
                  )}
                </div>

                {/* Face detection message - only in idle state */}
                {!capturedImage && cameraReady && modalState === 'idle' && (
                  <div className={`detection-message ${faceDetection.status}`}>
                    {faceDetection.message}
                  </div>
                )}

                {/* Local error message */}
                {verificationError && (
                  <div className="verification-error-message">
                    <XCircle size={16} />
                    <span>{verificationError}</span>
                  </div>
                )}

                {/* Status message for loading/success states */}
                {(modalState === 'registering' || modalState === 'verifying' || modalState === 'success') && (
                  <div className={`status-indicator-compact ${modalState}`}>
                    {getStatusIcon()}
                    <span>{message}</span>
                    {similarity !== null && modalState === 'success' && (
                      <span className="similarity-badge">{Math.round(similarity * 100)}%</span>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions-compact">
                {renderButtons()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProctorModal;