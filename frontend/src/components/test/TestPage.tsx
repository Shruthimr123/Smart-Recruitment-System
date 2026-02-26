import { useEffect, useState, useRef, useCallback } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  resetProctorState,
  incrementMalpractice,
  setIsTestStarted,
  setMalpracticeCount,
  setCurrentApplicantId,
} from "../../redux/slices/proctorSlice";
import "../css/TestPage.css";
import QuestionBlock from "./QuestionBlock";
import Sidebar from "./Sidebar";
 
import { Loader2 } from "lucide-react";
import axiosTestInstance from "../../api/axiosTestInstance";
import {
  decrementTime,
  setAnswer,
  setCurrentIndex,
  setStarted,
  setTimeLeft,
} from "../../redux/slices/test/testSlice";
import {
  evaluateTest,
  skipQuestion,
  submitAnswer,
  startTest,
} from "../../redux/slices/test/testThunks";
import { type RootState } from "../../redux/store";
import CodingPlatform from "./CodingApp/CodingPlatform";
import Alerts from "./ProctorApp/Alerts";
import Navbar from "./ProctorApp/Navbar";
import ProctorApp from "./ProctorApp/ProctorApp";
import MalpracticeTerminated from "./ProctorApp/MalpracticeTerminated";
import axiosInstance from "../../api/axiosInstance";
 
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
 
const TestPage = () => {
  const { token, applicantId, attemptId } = useParams();
  const { verificationComplete, malpracticeCount } = useSelector(
    (state: RootState) => state.proctor,
  );
 
  if (applicantId && attemptId) {
    localStorage.setItem("applicantId", applicantId.toString());
    localStorage.setItem("attemptId", attemptId.toString());
  }
 
  const dispatch = useDispatch<any>();
  const handle = useFullScreenHandle();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
 
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [showCodingPlatform, setShowCodingPlatform] = useState(false);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<any[]>([]);
  const [technicalQuestions, setTechnicalQuestions] = useState<any[]>([]);
  const [section, setSection] = useState<"aptitude" | "technical">("aptitude");
  const [experienceLevel, setExperienceLevel] = useState<
    "fresher" | "experienced"
  >("fresher");
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts] = useState(3);
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // New state for permanent block
 
  const submittedRef = useRef(false);
  const timeLeftRef = useRef(0);
  const startedRef = useRef(false);
  const handlingSubmissionRef = useRef(false);
 
  const { answers, currentIndex, submitted, timeLeft, started, loading } =
    useSelector((state: RootState) => state.test);
 
  //Reset state when applicantId changes
  useEffect(() => {
    // Reset proctor state when component mounts or applicantId changes
    console.log("🔄 Resetting proctor state for applicant:", applicantId);
 
    // Reset Redux state
    dispatch(resetProctorState());
 
    // Set current applicant ID in Redux
    if (applicantId) {
      dispatch(setCurrentApplicantId(applicantId));
    }
 
    // Clear any stored violation data from localStorage
    localStorage.removeItem(`malpractice-${applicantId}`);
 
    // Fetch current violation count from backend
    const fetchViolationCount = async () => {
      if (applicantId && token) {
        try {
          const response = await axiosInstance.get(
            `/malpractice/violation-status/${applicantId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
 
          if (response.data.success) {
            console.log(
              "📊 Fetched violation count:",
              response.data.totalViolations,
            );
            dispatch(setMalpracticeCount(response.data.totalViolations));
 
            // If already blocked, set blocked state
            if (response.data.isBlocked) {
              setIsBlocked(true);
            }
          }
        } catch (error) {
          console.error("Error fetching violation count:", error);
        }
      }
    };
 
    fetchViolationCount();
 
    // Cleanup function
    return () => {
      // Don't reset on unmount
    };
  }, [applicantId, dispatch, token]);
 
  // Listen for block events from WebcamCapture
  useEffect(() => {
    const handleBlockEvent = () => {
      console.log("🚫 Applicant blocked event received");
      setIsBlocked(true);
      // Stop the test if it's running
      if (started) {
        dispatch(setIsTestStarted(false));
        dispatch(setStarted(false));
      }
    };
 
    window.addEventListener("applicant-blocked", handleBlockEvent);
 
    return () => {
      window.removeEventListener("applicant-blocked", handleBlockEvent);
    };
  }, [dispatch, started]);
 
  // Update refs
  useEffect(() => {
    submittedRef.current = submitted;
    timeLeftRef.current = timeLeft;
    startedRef.current = started;
    navigateRef.current = navigate;
  }, [submitted, timeLeft, started, navigate]);
 
  // Validate token
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await axiosTestInstance.get(`/test/start/${token}`);
        console.log("Token validation successful:", response.data);
 
        // If response contains violation info, update Redux
        if (response.data.totalViolations !== undefined) {
          dispatch(setMalpracticeCount(response.data.totalViolations));
        }
      } catch (err: any) {
        console.error("Token validation failed:", err);
 
        // Check if applicant is blocked
        if (
          err.response?.status === 403 &&
          err.response?.data?.message === "APPLICANT_BLOCKED"
        ) {
          console.log("🚫 Applicant is permanently blocked");
          setIsBlocked(true);
          return;
        }
 
        navigate("/link-expired");
      }
    };
    if (token) validateToken();
    else navigate("/link-expired");
  }, [token, navigate, dispatch]);
 
  // Get initial attempt count on component mount
  useEffect(() => {
    const getInitialAttemptCount = async () => {
      if (token && applicantId && attemptId && !isBlocked) {
        try {
          console.log("📊 Getting initial attempt count...");
          const response = await axiosTestInstance.get(
            `/applicant-questions/assigned/${applicantId}/${attemptId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
 
          const initialAttemptCount = response.data.attemptCount || 0;
          setAttemptCount(initialAttemptCount);
          console.log("📊 Initial attempt count:", initialAttemptCount);
        } catch (error) {
          console.error("Error getting initial attempt count:", error);
        }
      }
    };
 
    getInitialAttemptCount();
  }, [token, applicantId, attemptId, isBlocked]);
 
  // Restore timer
  useEffect(() => {
    const saved = localStorage.getItem(`timer-${attemptId}`);
    if (saved) {
      const restored = parseInt(saved, 10);
      dispatch(setTimeLeft(restored > 10 ? restored : 60));
    }
  }, [attemptId, dispatch]);
 
  // Navigate on submission
  useEffect(() => {
    if (submitted && !submittedRef.current) {
      setTimeout(() => {
        navigateRef.current("/thank-you");
      }, 1000);
    }
  }, [submitted]);
 
  // Timer decrement
  useEffect(() => {
    if (!started || submitted || isBlocked) return;
    const timer = setInterval(() => {
      if (!submittedRef.current && startedRef.current) {
        dispatch(decrementTime({ attemptId }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted, dispatch, attemptId, isBlocked]);
 
  // Auto-submit when time ends
  useEffect(() => {
    if (
      timeLeft <= 0 &&
      started &&
      !submitted &&
      !submittingFinal &&
      !submittedRef.current &&
      !isBlocked
    ) {
      handleFinalSubmit();
    }
  }, [timeLeft, started, submitted, submittingFinal, isBlocked]);
 
  // Malpractice monitoring
  useEffect(() => {
    if (!started || submitted || isBlocked) return;
 
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) toast.warning("You exited fullscreen.");
    };
 
    const handleTabChange = () => {
      if (document.hidden) {
        toast.warning("Tab switching is not allowed.");
        if (malpracticeCount < 7) dispatch(incrementMalpractice());
      }
    };
 
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current && !isBlocked) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave?";
        return "Are you sure you want to leave?";
      }
    };
 
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleTabChange);
    window.addEventListener("beforeunload", beforeUnload);
 
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleTabChange);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [started, submitted, malpracticeCount, dispatch, isBlocked]);
 
  const handleStartTest = async () => {
    if (isStartingTest || isBlocked) return;
 
    if (attemptCount >= maxAttempts) {
      console.log(
        "🔴 Maximum attempts reached, navigating to attempts exceeded page...",
      );
      navigate("/attempts-exceeded");
      return;
    }
 
    setIsStartingTest(true);
 
    try {
      console.log(
        "🎯 handleStartTest called - Current attempt count:",
        attemptCount,
      );
 
      console.log("🟡 Calling startTest API to increment attempt count...");
 
      // Use the startTest thunk that increments attempt count
      const data = await dispatch(
        startTest({ token, applicantId, attemptId }),
      ).unwrap();
 
      // Get the Updated attempt count from the API response
      const newAttemptCount =
        data.currentAttemptCount || data.attemptCount || 0;
      const attemptsLeft = maxAttempts - newAttemptCount;
 
      console.log("🟢 New attempt count received:", newAttemptCount);
      console.log("🟢 Attempts left:", attemptsLeft);
 
      // Update local state with the NEW attempt count
      setAttemptCount(newAttemptCount);
 
      // Show attempts left using react-toastify
      toast.info(`Attempts left: ${attemptsLeft}`, {
        position: "bottom-left",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
 
      // Proceed with test setup
      handle.enter();
      dispatch(setStarted(true));
      dispatch(setIsTestStarted(true));
 
      // Process questions from response
      const aptitudeQs = data.questions.filter((q: any) => {
        let skillName = "";
        if (q.mcq_question?.skill) {
          if (typeof q.mcq_question.skill === "string")
            skillName = q.mcq_question.skill;
          else if (q.mcq_question.skill?.name)
            skillName = q.mcq_question.skill.name;
        }
        return skillName?.trim().toLowerCase() === "aptitude";
      });
 
      const technicalQs = data.questions.filter((q: any) => {
        let skillName = "";
        if (q.mcq_question?.skill) {
          if (typeof q.mcq_question.skill === "string")
            skillName = q.mcq_question.skill;
          else if (q.mcq_question.skill?.name)
            skillName = q.mcq_question.skill.name;
        }
        return skillName?.trim().toLowerCase() !== "aptitude";
      });
 
      setAptitudeQuestions(aptitudeQs);
      setTechnicalQuestions(technicalQs);
 
      if (aptitudeQs.length > 0) {
        setExperienceLevel("fresher");
      } else {
        setExperienceLevel("experienced");
      }
 
      // Handle session storage for resume
      const storedAttemptId = sessionStorage.getItem("attemptId");
      const savedSection = sessionStorage.getItem("currentSection") as
        | "aptitude"
        | "technical"
        | null;
      const savedIndex = sessionStorage.getItem("currentIndex");
 
      if (
        storedAttemptId === attemptId &&
        savedSection &&
        savedIndex !== null
      ) {
        if (savedSection === "aptitude" && aptitudeQs.length > 0) {
          setSection("aptitude");
          dispatch(setCurrentIndex(parseInt(savedIndex, 10)));
        } else if (savedSection === "technical" && technicalQs.length > 0) {
          setSection("technical");
          dispatch(setCurrentIndex(parseInt(savedIndex, 10)));
        } else {
          setSection(aptitudeQs.length > 0 ? "aptitude" : "technical");
          dispatch(setCurrentIndex(0));
        }
      } else {
        setSection(aptitudeQs.length > 0 ? "aptitude" : "technical");
        dispatch(setCurrentIndex(0));
      }
 
      console.log(
        "✅ Test started successfully with attempt count:",
        newAttemptCount,
      );
    } catch (error: any) {
      console.error("🔴 Error in handleStartTest:", error);
 
      // Check if applicant is blocked during start attempt
      if (
        error.response?.status === 403 &&
        error.response?.data?.message === "APPLICANT_BLOCKED"
      ) {
        console.log("🚫 Applicant is permanently blocked");
        setIsBlocked(true);
        return;
      }
 
      // Handle maximum attempts exceeded
      if (error.payload === "MAXIMUM_ATTEMPTS_EXCEEDED") {
        console.log("🔴 Maximum attempts exceeded from API, navigating...");
        setAttemptCount(maxAttempts);
        navigate("/attempts-exceeded");
      } else {
        console.error("Error starting test:", error);
        toast.error("Failed to start test. Please try again.");
      }
    } finally {
      setIsStartingTest(false);
    }
  };
 
  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isBlocked) return;
    const question =
      section === "aptitude"
        ? aptitudeQuestions[currentIndex]
        : technicalQuestions[currentIndex];
    if (!question?.editable) return;
    dispatch(setAnswer({ questionId, optionId }));
  };
 
  const handleNext = async () => {
    if (isBlocked) return;
    const activeSet =
      section === "aptitude" ? aptitudeQuestions : technicalQuestions;
    const q = activeSet[currentIndex];
    const selected = answers[q.mcq_question.id];
 
    if (!selected && q.status !== "answered") {
      toast.warning("Please select an option or click Skip.");
      return;
    }
 
    if (q.status !== "answered") {
      await dispatch(
        submitAnswer({
          token,
          applicantId,
          attemptId,
          questionId: q.mcq_question.id,
          selectedOptionId: selected,
        }),
      );
 
      const updatedQuestions = [...activeSet];
      updatedQuestions[currentIndex] = {
        ...q,
        status: "answered",
        editable: false,
      };
      if (section === "aptitude") setAptitudeQuestions(updatedQuestions);
      else setTechnicalQuestions(updatedQuestions);
    }
 
    if (currentIndex < activeSet.length - 1)
      dispatch(setCurrentIndex(currentIndex + 1));
  };
 
  const handleSkip = async () => {
    if (isBlocked) return;
    const activeSet =
      section === "aptitude" ? aptitudeQuestions : technicalQuestions;
    const q = activeSet[currentIndex];
    if (q.status === "answered") return;
 
    await dispatch(
      skipQuestion({
        token,
        applicantId,
        attemptId,
        questionId: q.mcq_question.id,
      }),
    );
 
    const updatedQuestions = [...activeSet];
    updatedQuestions[currentIndex] = {
      ...q,
      status: "skipped",
      editable: true,
    };
    if (section === "aptitude") setAptitudeQuestions(updatedQuestions);
    else setTechnicalQuestions(updatedQuestions);
 
    if (currentIndex < activeSet.length - 1)
      dispatch(setCurrentIndex(currentIndex + 1));
  };
 
  const handleFinalSubmit = useCallback(async () => {
    if (
      submittingFinal ||
      submittedRef.current ||
      handlingSubmissionRef.current ||
      isBlocked
    )
      return;
    handlingSubmissionRef.current = true;
    setSubmittingFinal(true);
    submittedRef.current = true;
 
    try {
      await dispatch(evaluateTest({ token, applicantId, attemptId }));
      localStorage.removeItem(`timer-${attemptId}`);
      toast.success("Test submitted successfully!");
      setTimeout(() => navigateRef.current("/thank-you"), 1500);
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Error while submitting test.");
      submittedRef.current = false;
      handlingSubmissionRef.current = false;
      setSubmittingFinal(false);
    }
  }, [token, applicantId, attemptId, dispatch, isBlocked]);
 
  const handleStartCoding = () => {
    if (isBlocked) return;
    setShowCodingPlatform(true);
  };
 
  const handleSubmitAptitude = () => {
    if (isBlocked) return;
    const allAttempted = aptitudeQuestions.every(
      (q) => q.status === "answered" || q.status === "skipped",
    );
    if (!allAttempted)
      return toast.warning(
        "Please answer or skip all questions before submitting.",
      );
    toast.success("Aptitude section submitted successfully!");
    setSection("technical");
    dispatch(setCurrentIndex(0));
    sessionStorage.setItem("currentSection", "technical");
    sessionStorage.setItem("currentIndex", "0");
  };
 
  const handleVerificationComplete = () => {
    console.log("✅ Verification complete from ProctorApp");
  };
 
  const getSectionHeader = () => {
    if (!started || isBlocked) return null;
 
    if (showCodingPlatform) {
      return {
        title: "Coding Section",
        description: "1 Coding Problem",
      };
    }
 
    if (experienceLevel === "fresher") {
      if (section === "aptitude") {
        return {
          title: "Aptitude Section",
          description: `${aptitudeQuestions.length} Questions`,
        };
      } else if (section === "technical") {
        return {
          title: "Technical Section",
          description: `${technicalQuestions.length} Questions`,
        };
      }
    } else {
      if (section === "technical") {
        return {
          title: "Technical Section",
          description: `${technicalQuestions.length} Questions`,
        };
      }
    }
 
    return null;
  };
 
  const getSidebarButtonText = () => {
    if (experienceLevel === "fresher") {
      if (section === "aptitude") {
        return "Start Technical Section";
      } else if (section === "technical") {
        return "Start Coding Test";
      }
    } else {
      if (section === "technical") {
        return "Start Coding Test";
      }
    }
    return "Start Next Section";
  };
 
  const getSidebarButtonAction = () => {
    if (experienceLevel === "fresher") {
      if (section === "aptitude") {
        return handleSubmitAptitude;
      } else if (section === "technical") {
        return handleStartCoding;
      }
    } else {
      if (section === "technical") {
        return handleStartCoding;
      }
    }
    return handleStartCoding;
  };
 
  const getStartButtonText = () => {
    if (isStartingTest) {
      return "Starting Test...";
    }
    return "Start Test";
  };
 
  const sectionHeader = getSectionHeader();
 
  // Show malpractice termination page if blocked
  if (isBlocked) {
    return <MalpracticeTerminated />;
  }
 
  return (
    <FullScreen handle={handle} className="test-page-container">
      <Navbar
        timeLeft={timeLeft}
        formatTime={formatTime}
        sectionHeader={sectionHeader}
        onTimeUp={handleFinalSubmit}
      />
      <Outlet />
      <Alerts />
      <ProctorApp
        onVerificationComplete={handleVerificationComplete}
        handleFinalSubmit={handleFinalSubmit}
      />
 
      <div className="test-content-area">
        <div className="test-main-wrapper">
          <ToastContainer
            position="bottom-left"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
          {loading ? (
            <div className="test-loading">
              <Loader2 className="loading-spinner" />
            </div>
          ) : (
            <>
              {!started && !submitted ? (
                <div className="test-instructions-container">
                  <div className="test-instructions">
                    <div className="instructions-header">
                      <h2>Test Instructions</h2>
                      <div className="attempts-counter">
                        Attempts: {attemptCount}/{maxAttempts}
                      </div>
                    </div>
 
                    <div className="instructions-content">
                      <h3>General Guidelines</h3>
                      <p>Please read carefully before beginning your test:</p>
                      <ul>
                        <li>
                          The test consists of two sections:
                          <ul>
                            <li>Multiple Choice Questions (MCQs)</li>
                            <li>Coding Questions</li>
                          </ul>
                        </li>
                        <li>
                          Ensure a stable internet connection throughout the
                          test.
                        </li>
                        <li>
                          Do not refresh or close the browser while taking the
                          test.
                        </li>
                        <li>
                          Your activity will be continuously monitored by the
                          proctoring system.
                        </li>
                        <li>
                          Use a working webcam and microphone, and sit in a
                          well-lit environment with no strong backlight.
                        </li>
                        <li>
                          Only you should be visible in the camera frame;
                          multiple faces or mismatched faces may lead to
                          violations.
                        </li>
                        <li>
                          Close all unnecessary applications to avoid
                          interruptions.
                        </li>
                        <li>
                          Sit upright and face the camera directly during the
                          test. Do not move away from the screen or attempt to
                          use another person or device for help.
                        </li>
                      </ul>
 
                      <h3>MCQ Section</h3>
                      <ul>
                        <li>Each question has only one correct answer.</li>
                        <li>
                          You may skip questions and return to them before
                          starting the coding section.
                        </li>
                        <li>
                          Once you select an answer and click Next, you cannot
                          revisit that question.
                        </li>
                        <li>
                          Carefully review all your answers before proceeding to
                          the coding section.
                        </li>
                      </ul>
 
                      <h3>Coding Section</h3>
                      <ul>
                        <li>
                          Write your code inside the provided function
                          signature.
                        </li>
                        <li>
                          Your function must return the result; do not use print
                          statements.
                        </li>
                        <li>
                          Avoid using built-in methods unless explicitly
                          allowed.
                        </li>
                        <li>
                          Ensure your code is correct, complete, and efficient
                          before submission.
                        </li>
                      </ul>
 
                      <h3>Face Capture & Malpractice Detection</h3>
                      <ul>
                        <li>The system continuously monitors your face.</li>
                        <li>
                          If your face is not detected, the test may be flagged.
                        </li>
                        <li>
                          If multiple faces are detected, the test may be
                          terminated.
                        </li>
                        <li>
                          If your captured face does not match during the test,
                          it will be marked as a violation.
                        </li>
                      </ul>
 
                      <h3>Submission Guidelines</h3>
                      <ul>
                        <li>
                          Carefully review your code and ensure it meets all
                          requirements before submitting.
                        </li>
                        <li>Click the Submit button to finalize your test.</li>
                        <li>
                          Once submitted, you cannot make any further changes to
                          your code.
                        </li>
                        <li>
                          After submission, the system will automatically record
                          your final submission and perform any necessary
                          proctoring cleanup.
                        </li>
                      </ul>
                    </div>
 
                    <div className="instructions-actions">
                      {verificationComplete && (
                        <button
                          className="test-start-button"
                          onClick={handleStartTest}
                          disabled={isStartingTest}
                        >
                          {getStartButtonText()}
                        </button>
                      )}
 
                      {!verificationComplete && (
                        <div className="verification-waiting-message">
                          <Loader2 className="spinning" size={20} />
                          <span>
                            Complete proctor verification to start test...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : showCodingPlatform ? (
                <div className="coding-platform-wrapper">
                  <div className="coding-platform-content">
                    <CodingPlatform
                      handleFinalSubmit={handleFinalSubmit}
                      autoSubmit={timeLeft <= 0}
                    />
                  </div>
                </div>
              ) : (
                <div className="mcq-test-wrapper">
                  <div className="test-mcq-container">
                    {section === "aptitude" && aptitudeQuestions.length > 0 && (
                      <>
                        <QuestionBlock
                          currentQuestion={aptitudeQuestions[currentIndex]}
                          currentIndex={currentIndex}
                          answers={answers}
                          handleOptionSelect={handleOptionSelect}
                          handleNext={handleNext}
                          handleSkip={handleSkip}
                        />
                        <Sidebar
                          questions={aptitudeQuestions}
                          currentIndex={currentIndex}
                          setCurrentIndex={(index) =>
                            dispatch(setCurrentIndex(index))
                          }
                          answeredCount={
                            aptitudeQuestions.filter(
                              (q) => q.status === "answered",
                            ).length
                          }
                          onStartNextSection={getSidebarButtonAction()}
                          buttonText={getSidebarButtonText()}
                        />
                      </>
                    )}
                    {section === "technical" &&
                      technicalQuestions.length > 0 && (
                        <>
                          <QuestionBlock
                            currentQuestion={technicalQuestions[currentIndex]}
                            currentIndex={currentIndex}
                            answers={answers}
                            handleOptionSelect={handleOptionSelect}
                            handleNext={handleNext}
                            handleSkip={handleSkip}
                          />
                          <Sidebar
                            questions={technicalQuestions}
                            currentIndex={currentIndex}
                            setCurrentIndex={(index) =>
                              dispatch(setCurrentIndex(index))
                            }
                            answeredCount={
                              technicalQuestions.filter(
                                (q) => q.status === "answered",
                              ).length
                            }
                            onStartNextSection={getSidebarButtonAction()}
                            buttonText={getSidebarButtonText()}
                          />
                        </>
                      )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FullScreen>
  );
};
 
export default TestPage;
 
 