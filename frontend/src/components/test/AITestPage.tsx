import { useEffect, useState, useRef, useCallback } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  incrementMalpractice,
  setIsTestStarted
} from "../../redux/slices/proctorSlice";
import { setStarted } from "../../redux/slices/test/testSlice";
import "../css/TestPage.css";
import "../css/AITestPage.css";
import { Loader2 } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { type RootState } from "../../redux/store";
import CodingPlatform from "./CodingApp/CodingPlatform";
import Alerts from "./ProctorApp/Alerts";
import Navbar from "./ProctorApp/Navbar";
import ProctorApp from "./ProctorApp/ProctorApp";

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

interface Option {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

interface MCQ {
  id: string;
  questionTitle: string;
  difficulty: string;
  options: Option[];
  skill: { id: string; name: string };
}

interface QuestionState {
  id: string;
  status: "not_visited" | "skipped" | "answered";
  selectedOptionId: string | null;
  editable: boolean;
  mcq_question: MCQ;
}

const AITestPage = () => {
  const { token, applicantId, attemptId } = useParams();
  const { verificationComplete, malpracticeCount } = useSelector(
    (state: RootState) => state.proctor
  );

  if (applicantId && attemptId) {
    localStorage.setItem("applicantId", applicantId.toString());
    localStorage.setItem("attemptId", attemptId.toString());
  }

  // Store token for axios interceptor
  if (token) {
    localStorage.setItem("token", token);
  }

  const dispatch = useDispatch<any>();
  const handle = useFullScreenHandle();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [showCodingPlatform, setShowCodingPlatform] = useState(false);
  const [timeLeft, setTimeLeftState] = useState(45 * 60);

  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentDifficulty, setCurrentDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("easy");
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts] = useState(3);
  const [loading, setLoading] = useState(false);
  const [serverQuestionNumber, setServerQuestionNumber] = useState(1);
  
  const isTestStarted = useSelector(
    (state: RootState) => state.proctor.isTestStarted
  );

  const submittedRef = useRef(false);
  const timeLeftRef = useRef(timeLeft);
  const startedRef = useRef(isTestStarted);
  
  useEffect(() => {
    startedRef.current = isTestStarted;
  }, [isTestStarted]);
  
  const handlingSubmissionRef = useRef(false);

  useEffect(() => {
    submittedRef.current = submittingFinal;
    timeLeftRef.current = timeLeft;
    startedRef.current = isTestStarted;
    navigateRef.current = navigate;
  }, [submittingFinal, timeLeft, isTestStarted, navigate]);

  // Token validation
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) throw new Error("No token");
        await axiosInstance.get(`/test/start/${token}`);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        navigate("/link-expired");
      }
    };
    validateToken();
  }, [token, navigate]);

  // Fetch initial attempt count
  useEffect(() => {
    const getInitialAttemptCount = async () => {
      if (!token || !applicantId || !attemptId) return;
      try {
        const response = await axiosInstance.get(
          `/ai-test/assigned/${applicantId}/${attemptId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAttemptCount(response.data.attemptCount || 0);
      } catch (error) {
        console.error(error);
      }
    };
    getInitialAttemptCount();
  }, [token, applicantId, attemptId]);

  // Timer restore
  useEffect(() => {
    const saved = localStorage.getItem(`timer-${attemptId}`);
    if (saved)
      setTimeLeftState(parseInt(saved, 10) > 10 ? parseInt(saved, 10) : 60);
  }, [attemptId]);

  // Timer decrement
  useEffect(() => {
    if (!isTestStarted || submittingFinal) return;
    const timer = setInterval(() => {
      if (!submittedRef.current && startedRef.current) {
        setTimeLeftState((prev) => {
          const newTime = prev > 0 ? prev - 1 : 0;
          localStorage.setItem(`timer-${attemptId}`, newTime.toString());
          return newTime;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isTestStarted, submittingFinal, attemptId]);

  // Auto submit
  useEffect(() => {
    if (timeLeft <= 0 && isTestStarted && !submittingFinal && !submittedRef.current) {
      handleFinalSubmit();
    }
  }, [timeLeft, isTestStarted, submittingFinal]);

  // Malpractice monitoring
  useEffect(() => {
    if (!isTestStarted || submittingFinal) return;

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
      if (!submittedRef.current) {
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
  }, [isTestStarted, submittingFinal, malpracticeCount, dispatch]);

  const handleStartTest = async () => {
    if (isStartingTest) return;
    if (attemptCount >= maxAttempts) {
      navigate("/attempts-exceeded");
      return;
    }

    setIsStartingTest(true);
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        `/ai-test/start/${applicantId}/${attemptId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.skipMCQ) {
        setShowCodingPlatform(true);
        handle.enter();
        dispatch(setIsTestStarted(true));
        dispatch(setStarted(true));
        setLoading(false);
        return;
      }

      setAttemptCount(response.data.attemptCount || 0);

      const questionsResponse = await axiosInstance.get(
        `/ai-test/questions/${applicantId}/${attemptId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (
        questionsResponse.data.questions &&
        questionsResponse.data.questions.length > 0
      ) {
        setQuestions(questionsResponse.data.questions);
        setCurrentDifficulty(
          questionsResponse.data.currentDifficulty || "easy"
        );
        setServerQuestionNumber(
          questionsResponse.data.currentQuestionNumber || 1
        );
        handle.enter();
        
        dispatch(setIsTestStarted(true));
        dispatch(setStarted(true)); // FIXED: Use the imported action
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      toast.error("Failed to start test. Please try again.");
    } finally {
      setIsStartingTest(false);
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion?.editable) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNextQuestion = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedOptionId = answers[currentQuestion.mcq_question.id];

    if (!selectedOptionId && currentQuestion.status !== "answered") {
      toast.warning("Please select an option.");
      return;
    }

    try {
      await axiosInstance.post(
        "/ai-test/answer",
        {
          applicantId,
          attemptId,
          questionId: currentQuestion.mcq_question.id,
          selectedOptionId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex] = {
        ...currentQuestion,
        status: "answered",
        editable: false,
      };
      setQuestions(updatedQuestions);

      // Next question logic
      if (
        serverQuestionNumber % 5 === 0 ||
        currentQuestionIndex === questions.length - 1
      ) {
        const nextSetResponse = await axiosInstance.get(
          `/ai-test/next-set/${applicantId}/${attemptId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (nextSetResponse.data.questions?.length > 0) {
          setQuestions(nextSetResponse.data.questions);
          setCurrentDifficulty(nextSetResponse.data.currentDifficulty);
          setCurrentQuestionIndex(0);
          setAnswers({});
          setServerQuestionNumber(nextSetResponse.data.currentQuestionNumber);
        } else if (nextSetResponse.data.completed) {
          toast.success("MCQ section completed! Moving to coding section...");
          setTimeout(() => setShowCodingPlatform(true), 1500);
          return;
        }
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setServerQuestionNumber(serverQuestionNumber + 1);
      }

      if (serverQuestionNumber >= 30) {
        toast.success("MCQ section completed! Moving to coding section...");
        setTimeout(() => setShowCodingPlatform(true), 1500);
      }
    } catch (error) {
      toast.error("Failed to submit answer. Please try again.");
    }
  };

  const handleFinalSubmit = useCallback(async () => {
    if (
      submittingFinal ||
      submittedRef.current ||
      handlingSubmissionRef.current
    )
      return;
    handlingSubmissionRef.current = true;
    setSubmittingFinal(true);
    submittedRef.current = true;

    try {
      await axiosInstance.post(
        "/ai-test/evaluate",
        { applicantId, attemptId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.removeItem(`timer-${attemptId}`);
      toast.success("Test submitted successfully!");
      setTimeout(() => navigate("/thank-you"), 1500);
    } catch (err) {
      toast.error("Error while submitting test.");
      submittedRef.current = false;
      handlingSubmissionRef.current = false;
      setSubmittingFinal(false);
    }
  }, [token, applicantId, attemptId, navigate]);

  // ADD THIS: Handler for verification completion
  const handleVerificationComplete = useCallback(() => {
    console.log("✅ Verification complete in AITestPage");
    // The ProctorModal already dispatches setVerificationComplete
    // This just confirms it happened
  }, []);

  const getDifficultyColor = () => {
    switch (currentDifficulty) {
      case "easy":
        return "#4CAF50";
      case "medium":
        return "#FFC107";
      case "hard":
        return "#F44336";
      default:
        return "#4CAF50";
    }
  };

  const getDifficultyText = () => {
    switch (currentDifficulty) {
      case "easy":
        return "Easy";
      case "medium":
        return "Medium";
      case "hard":
        return "Hard";
      default:
        return "Easy";
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <FullScreen handle={handle} className="test-page-container">
      <Navbar
        timeLeft={timeLeft}
        formatTime={formatTime}
        onTimeUp={handleFinalSubmit}
        sectionHeader={
          isTestStarted
            ? {
                title: "Technical Section",
                description: `Question ${serverQuestionNumber} of 30`,
              }
            : null
        }
      />
      <Alerts />
      <ProctorApp
        handleFinalSubmit={handleFinalSubmit}
        onVerificationComplete={handleVerificationComplete} // FIXED: Pass the handler
      />
      <div className="test-content-area no-top-space">
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
          ) : !isTestStarted && !submittingFinal ? (
            // Instructions Screen - Only shown when test not started
            <div className="instructions-content">
              <div className="ai-test-intro">
                <div className="ai-icon">🤖</div>
                <h3>Welcome to AI Adaptive Test</h3>
                <p>
                  This test adapts to your skill level in real-time, providing a
                  personalized assessment experience.
                </p>
              </div>

              <h3>How It Works</h3>
              <ul>
                <li>The test automatically adjusts difficulty based on your performance</li>
                <li>Start with foundational questions that match your skill level</li>
                <li>As you answer correctly, questions become more challenging</li>
                <li>If you find questions difficult, the test adapts to your comfort level</li>
                <li>Total: 30 questions with varying complexity</li>
              </ul>

              <h3>General Guidelines</h3>
              <ul>
                <li>Questions appear one at a time - you cannot go back</li>
                <li>Ensure stable internet connection throughout the test</li>
                <li>Do not refresh or close the browser</li>
                <li>Activity is continuously monitored by proctoring system</li>
                <li>Use a working webcam and microphone</li>
                <li>Close all unnecessary applications</li>
              </ul>

              <div className="test-features">
                <div className="feature">
                  <div className="feature-icon">🎯</div>
                  <div className="feature-text">
                    <strong>Personalized Assessment</strong>
                    <p>Questions tailored to your skill level</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-text">
                    <strong>Real-time Adaptation</strong>
                    <p>Difficulty adjusts as you progress</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🛡️</div>
                  <div className="feature-text">
                    <strong>Secure Proctoring</strong>
                    <p>Continuous monitoring for fair assessment</p>
                  </div>
                </div>
              </div>

              <h3>Submission</h3>
              <ul>
                <li>After completing 30 MCQ questions, you'll proceed to coding section</li>
                <li>Carefully review your code before final submission</li>
                <li>Once submitted, you cannot make changes</li>
              </ul>

              <button
                className="ai-start-button"
                onClick={handleStartTest}
                disabled={
                  isStartingTest ||
                  attemptCount >= maxAttempts ||
                  !verificationComplete // This is key - button enabled only after verification
                }
              >
                {isStartingTest ? "Starting..." : "Start Test"}
              </button>
              
              {/* Show waiting message if verification not complete */}
              {!verificationComplete && !isStartingTest && (
                <div className="verification-waiting-message">
                  <Loader2 className="spinning" size={20} />
                  <span>Complete proctor verification to start test...</span>
                </div>
              )}
            </div>
          ) : showCodingPlatform ? (
            <CodingPlatform
              handleFinalSubmit={handleFinalSubmit}
              autoSubmit={timeLeft <= 0}
            />
          ) : (
            currentQuestion && (
              <div className="ai-mcq-container card-style">
                {/* Question Header with number, difficulty, and progress */}
                <div className="ai-question-header">
                  <div className="ai-question-info">
                    <div className="ai-question-number">
                      Question {serverQuestionNumber} <span className="ai-total-questions">/ 30</span>
                    </div>

                    <div
                      className="ai-difficulty-indicator"
                      style={{ backgroundColor: getDifficultyColor() }}
                    >
                      {getDifficultyText()} Level
                    </div>
                  </div>

                  <div className="ai-progress-indicator">
                    <div className="ai-progress-bar">
                      <div
                        className="ai-progress-fill"
                        style={{ width: `${(serverQuestionNumber / 30) * 100}%` }}
                      />
                    </div>
                    <div className="ai-progress-text">
                      Progress: {Math.round((serverQuestionNumber / 30) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Question Block */}
                <div className="ai-question-content">
                  <div className="ai-question-title">
                    {currentQuestion.mcq_question.questionTitle}
                  </div>
                  {!currentQuestion.editable && (
                    <div className="ai-edit-warning">
                      ⚠️ Answer submitted - Cannot be changed
                    </div>
                  )}

                  <div className="ai-options-grid">
                    {currentQuestion.mcq_question.options.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className={`ai-option-card ${
                          answers[currentQuestion.mcq_question.id] === opt.id ? "selected" : ""
                        }`}
                        onClick={() =>
                          currentQuestion.editable &&
                          handleOptionSelect(
                            currentQuestion.mcq_question.id,
                            opt.id
                          )
                        }
                      >
                        <div className="ai-option-content">
                          <div className="ai-option-letter">{String.fromCharCode(65 + idx)}</div>
                          <div className="ai-option-text">{opt.optionText}</div>
                          {answers[currentQuestion.mcq_question.id] === opt.id && (
                            <div className="ai-option-selected">✓</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ai-navigation card-footer">
                    <button
                      className="ai-next-button"
                      onClick={handleNextQuestion}
                      disabled={
                        !answers[currentQuestion.mcq_question.id] &&
                        currentQuestion.status !== "answered"
                      }
                    >
                      {serverQuestionNumber === 30 ? "Complete Test" : "Next Question"}
                    </button>
                    
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </FullScreen>
  );
};

export default AITestPage;