import {
  matchPath,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import AddCodingQuestions from "./components/AddCodingQuestions";
import AddJob from "./components/AddJob";
import AddMCQ from "./components/AddMCQ";
import AddQuestions from "./components/AddQuestions";
import AddUsers from "./components/AddUsers";
import AllUsers from "./components/AllUsers";
import ApplicantDetails from "./components/ApplicantDetails";
import AttemptsExceeded from "./components/AttemptsExceeded";
import CodingResult from "./components/CodingResult";
import Home from "./components/Home";
import Jobs from "./components/Jobs";
import LinkExpired from "./components/LinkExpired";
import Login from "./components/Login";
import Logout from "./components/Logout";
import MalpracticeImages from "./components/MalpracticeImages";
import McqResultRouter from "./components/McqResultRouter";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Results from "./components/Results";
import SendTest from "./components/SendTest";
import TestPage from "./components/test/TestPage";
import ThankYou from "./components/test/ThankYou";
import ViewCoding from "./components/ViewCoding";
import ViewMCQ from "./components/ViewMCQ";
import ViewQuestions from "./components/ViewQuestions";
import axiosInstance from "./api/axiosInstance";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import SelectMCQs from "./components/test/SelectMCQs";
import TestMode from "./components/TestMode";
import AIMode from "./components/AIMode";
import AITestPage from "./components/test/AITestPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useDispatch, useSelector } from "react-redux";
import { setAuth, clearAuth } from "./redux/slices/authSlice";
import type { RootState } from "./redux/store";
import ScrollToTop from "./components/ScrollToTop";
 
const AppLayout = () => {
  const location = useLocation();
 
  const hideLayout =
    matchPath("/ai-test/:token/:applicantId/:attemptId", location.pathname) ||
    matchPath("/ai-test/thank-you", location.pathname) ||
    matchPath("/ai-test/attempts-exceeded", location.pathname) ||
    matchPath("/ai-test/link-expired", location.pathname) ||
    matchPath("/test/:token/:applicantId/:attemptId", location.pathname) ||
    matchPath("/test/thank-you", location.pathname) ||
    matchPath("/test/attempts-exceeded", location.pathname) ||
    matchPath("/test/link-expired", location.pathname);
 
  return (
    <div className="app-container">
      {!hideLayout && <Navbar />}
      <main className="content">
        <Outlet />
      </main>
      {!hideLayout && <Footer />}
    </div>
  );
};
 
// Standalone layout for test pages
const StandaloneLayout = () => {
  return <Outlet />;
};
 
function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
 
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
 
  const location = useLocation();
  const isTestRoute =
    location.pathname.startsWith("/test") ||
    location.pathname.startsWith("/ai-test");
 
  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
 
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          dispatch(setAuth({ user: userData, token }));
        } catch (e) {
          console.error("Failed to parse user data", e);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(clearAuth());
        }
      } else {
        dispatch(clearAuth());
      }
 
      setIsAuthInitialized(true);
    };
 
    initializeAuth();
  }, [dispatch]);
 
  // User status check
  const { data: userStatus } = useQuery({
    queryKey: ["userStatus", currentUser?.email],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/auth/user-status/${currentUser?.email}`,
      );
      return response?.data?.data;
    },
    enabled: !!currentUser?.email && isAuthenticated && !isTestRoute,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
 
  useEffect(() => {
    if (userStatus?.data === "inactive" && isAuthenticated) {
      localStorage.clear();
      dispatch(clearAuth());
      navigate("/login");
    }
  }, [userStatus, navigate, dispatch, isAuthenticated]);
 
  // Show nothing while auth is initializing
  if (!isAuthInitialized) {
    return null;
  }
 
  return (
    <div className="container">
      <ScrollToTop/>
      <Routes>
        {/* PUBLIC ROUTES*/}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
 
        {/* TEST ROUTES*/}
        <Route path="/test/*" element={<StandaloneLayout />}>
          <Route path="thank-you" element={<ThankYou />} />
          <Route path="attempts-exceeded" element={<AttemptsExceeded />} />
          <Route path="link-expired" element={<LinkExpired />} />
          <Route path=":token/:applicantId/:attemptId" element={<TestPage />} />
        </Route>
 
        {/* AI TEST ROUTES */}
        <Route path="/ai-test/*" element={<StandaloneLayout />}>
          <Route path="thank-you" element={<ThankYou />} />
          <Route path="attempts-exceeded" element={<AttemptsExceeded />} />
          <Route path="link-expired" element={<LinkExpired />} />
          <Route
            path=":token/:applicantId/:attemptId"
            element={<AITestPage />}
          />
        </Route>
 
        {/* Direct standalone routes for backward compatibility */}
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/attempts-exceeded" element={<AttemptsExceeded />} />
        <Route path="/link-expired" element={<LinkExpired />} />
 
        {/* PROTECTED ROUTES - require authentication */}
        <Route path="/" element={<AppLayout />}>
          {/* Public routes inside layout*/}
          <Route index element={<Home />} />
 
          {/* Auth routes */}
          <Route path="login" element={<Login />} />
          <Route path="logout" element={<Logout />} />
 
          {/* All protected routes wrapped with ProtectedRoute */}
          <Route
            path="all-users"
            element={
              <ProtectedRoute allowedRoles={["super admin"]}>
                <AllUsers />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="add-users"
            element={
              <ProtectedRoute allowedRoles={["super admin"]}>
                <AddUsers />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="send-test"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <SendTest />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="test-mode"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <TestMode />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="select-mcqs"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <SelectMCQs />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="jobs"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <Jobs />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="add-job"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <AddJob />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="add-questions"
            element={
              <ProtectedRoute allowedRoles={["super admin", "manager"]}>
                <AddQuestions />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="add-mcq"
            element={
              <ProtectedRoute allowedRoles={["super admin", "manager"]}>
                <AddMCQ />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="add-coding"
            element={
              <ProtectedRoute allowedRoles={["super admin", "manager"]}>
                <AddCodingQuestions />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="view-questions"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <ViewQuestions />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="view-mcq"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <ViewMCQ />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="view-coding"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <ViewCoding />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="results"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <Results />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="results/mcq/:type/:applicantId"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <McqResultRouter />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="results/coding/:applicantId"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <CodingResult />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="applicant-info/:id"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <ApplicantDetails />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="results/malpractice/:id"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "manager", "talent acquisition"]}
              >
                <MalpracticeImages />
              </ProtectedRoute>
            }
          />
 
          <Route
            path="ai-mode"
            element={
              <ProtectedRoute
                allowedRoles={["super admin", "talent acquisition"]}
              >
                <AIMode />
              </ProtectedRoute>
            }
          />
 
          {/* Catch-all route for 404*/}
          <Route path="*" element={<NotFound />} />
        </Route>
 
        {/* Global catch-all for any unmatched routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
 
export default App;
 