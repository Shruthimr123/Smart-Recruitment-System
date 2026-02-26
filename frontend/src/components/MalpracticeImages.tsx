import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  XCircle,
  AlertTriangle,
  Camera,
  User,
  Calendar,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./css/MalpracticeImages.css";

interface MalpracticeImage {
  id: string;
  timestamp: string;
  profileImageUrl: string;
  malpracticeImageUrl?: string;
  alertMessage?: string;
  confidence?: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  registeredFace?: string;
  malpractice: MalpracticeImage[];
  test_attempts: Array<{
    test_status: string;
    start_time?: string;
    end_time?: string;
    score?: number;
  }>;
}

const fetchApplicantData = async (id: string) => {
  const { data } = await axiosInstance.get("/dashboard");
  return data.data.find((candidate: Candidate) => candidate.id === id);
};

const MalpracticeImages = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedViolationType, setSelectedViolationType] =
    useState<string>("all");

  const {
    data: candidate,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchApplicantData(id as string),
    enabled: !!id,
  });

  // Separate registered face and violation records
  const registeredFace =
    candidate?.malpractice?.find((m: MalpracticeImage) => !m.alertMessage)
      ?.profileImageUrl || null;

  const violationImages =
    candidate?.malpractice?.filter((m: MalpracticeImage) => !!m.alertMessage) ||
    [];

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get violation counts
  const getViolationStats = () => {
    const images = violationImages;
    const stats: Record<string, number> = {
      total: images.length,
      faceNotDetected: 0,
      faceMismatch: 0,
      multipleFacesDetected: 0,
      tabSwitch: 0,
      fullscreenExit: 0,
    };

    images.forEach((img: MalpracticeImage) => {
      const msg = img.alertMessage?.toLowerCase() || "";
      if (msg.includes("face not detected")) stats.faceNotDetected++;
      else if (msg.includes("face mismatch")) stats.faceMismatch++;
      else if (msg.includes("multiple faces detected"))
        stats.multipleFacesDetected++;
      else if (msg.includes("tab switch")) stats.tabSwitch++;
      else if (msg.includes("fullscreen exit")) stats.fullscreenExit++;
    });

    return stats;
  };

  const violationStats = getViolationStats();

  // Filter images by violation type
  const getFilteredImages = () => {
    if (selectedViolationType === "all") return violationImages;

    return (candidate?.malpractice || []).filter((img: MalpracticeImage) => {
      const msg = img.alertMessage?.toLowerCase() || "";
      switch (selectedViolationType) {
        case "faceNotDetected":
          return msg.includes("face not detected");
        case "faceMismatch":
          return msg.includes("face mismatch");
        case "multipleFacesDetected":
          return msg.includes("multiple faces detected");
        case "tabSwitch":
          return msg.includes("tab switch");
        case "fullscreenExit":
          return msg.includes("fullscreen exit");
        default:
          return true;
      }
    });
  };

  const filteredImages = getFilteredImages();

  // Handle image modal
  const openImageModal = (imageUrl: string, index: number) => {
    setSelectedImage(imageUrl);
    setCurrentImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: string) => {
    const images = filteredImages;
    let newIndex;

    if (direction === "next") {
      newIndex =
        currentImageIndex + 1 >= images.length ? 0 : currentImageIndex + 1;
    } else {
      newIndex =
        currentImageIndex - 1 < 0 ? images.length - 1 : currentImageIndex - 1;
    }

    setCurrentImageIndex(newIndex);
    setSelectedImage(images[newIndex].profileImageUrl);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedImage) return;

      if (e.key === "ArrowRight") {
        navigateImage("next");
      } else if (e.key === "ArrowLeft") {
        navigateImage("prev");
      } else if (e.key === "Escape") {
        closeImageModal();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedImage, currentImageIndex, filteredImages]);

  if (isLoading) {
    return (
      <div className="malpractice-loading">
        <div className="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p>Loading candidate data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="malpractice-error">
        <div className="error-content">
          <XCircle className="h-12 w-12 text-red-600" />
          <h3>Error Loading Data</h3>
          <p>There was a problem fetching the candidate information.</p>
          <button onClick={() => navigate("/results")} className="back-button">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="malpractice-error">
        <div className="error-content">
          <User className="h-12 w-12 text-gray-400" />
          <h3>Candidate Not Found</h3>
          <p>The requested candidate could not be found.</p>
          <button onClick={() => navigate("/results")} className="back-button">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="malpractice-container">
      {/* Header with Navigation */}
      <div className="malpractice-header">
        <div className="header-top">
          <button onClick={() => navigate("/results")} className="back-button">
            <ChevronLeft className="h-4 w-4" />
            Back to Results
          </button>
        </div>

        <div className="header-content">
          <div className="candidate-title-section">
            <h1>Proctoring Review</h1>
            <p>Review candidate's assessment session and violation history</p>
          </div>
        </div>
      </div>

      {/* Candidate Overview Card */}
      <div className="candidate-overview">
        <div className="overview-card">
          <div className="registered-face-section">
            <h3>
              <Camera className="h-5 w-5" />
              Registered Face
            </h3>
            <div className="registered-face-container">
              <img
                src={
                  registeredFace ||
                  "https://placehold.co/400x400/3b82f6/white?text=No+Face"
                }
                alt="Registered face"
                className="registered-face-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "https://placehold.co/400x400/3b82f6/white?text=No+Face";
                }}
              />
            </div>
          </div>

          <div className="candidate-details">
            <div className="details-header">
              <h2>{candidate.name}</h2>
              <span className="test-status-badge">
                {candidate.test_attempts[0]?.test_status || "N/A"}
              </span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <Mail className="h-4 w-4" />
                <span>{candidate.email}</span>
              </div>
              <div className="detail-item">
                <Calendar className="h-4 w-4" />
                <span>ID: {candidate.id}</span>
              </div>
              {candidate.test_attempts[0]?.start_time && (
                <div className="detail-item">
                  <Clock className="h-4 w-4" />
                  <span>
                    Started:{" "}
                    {formatTimestamp(candidate.test_attempts[0].start_time)}
                  </span>
                </div>
              )}
            </div>

            {/* Violation Stats */}
            <div className="violation-stats">
              <h4>Violation Summary</h4>
              <div className="stats-grid">
                <div className="stat-card total">
                  <span className="stat-value">{violationStats.total}</span>
                  <span className="stat-label">Total Violations</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">
                    {violationStats.faceNotDetected}
                  </span>
                  <span className="stat-label">Face Not Detected</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">
                    {violationStats.faceMismatch}
                  </span>
                  <span className="stat-label">Face Mismatch</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">
                    {violationStats.multipleFacesDetected}
                  </span>
                  <span className="stat-label">Multiple Faces</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{violationStats.tabSwitch}</span>
                  <span className="stat-label">Tab Switches</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">
                    {violationStats.fullscreenExit}
                  </span>
                  <span className="stat-label">Fullscreen Exits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Malpractice Images Section */}
      <div className="malpractice-section">
        <div className="section-header">
          <div className="section-title">
            <h2>Violation Images</h2>
            <p>
              {filteredImages.length}{" "}
              {filteredImages.length === 1 ? "image" : "images"} captured during
              assessment
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="filter-container">
            <select
              value={selectedViolationType}
              onChange={(e) => setSelectedViolationType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Violations</option>
              <option value="faceNotDetected">Face Not Detected</option>
              <option value="faceMismatch">Face Mismatch</option>
              <option value="multipleFacesDetected">Multiple Faces</option>
              <option value="tabSwitch">Tab Switch</option>
              <option value="fullscreenExit">Fullscreen Exit</option>
            </select>
          </div>
        </div>

        {filteredImages.length === 0 ? (
          <div className="no-images">
            <ImageIcon className="h-16 w-16 text-gray-300" />
            <h3>No Violation Images</h3>
            <p>No proctoring violations were detected for this candidate.</p>
          </div>
        ) : (
          <div className="images-grid">
            {filteredImages.map(
              (malpractice: MalpracticeImage, index: number) => (
                <div key={malpractice.id} className="violation-card">
                  <div className="violation-card-header">
                    <div className="violation-number">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Violation #{index + 1}</span>
                    </div>
                    <div className="violation-time">
                      {formatTimestamp(malpractice.timestamp)}
                    </div>
                  </div>

                  <div className="violation-images">
                    <div className="violation-image-container">
                      <img
                        src={malpractice.profileImageUrl}
                        alt={`Violation ${index + 1}`}
                        className="violation-image"
                        onClick={() =>
                          openImageModal(malpractice.profileImageUrl, index)
                        }
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src =
                            "https://placehold.co/400x300/ef4444/white?text=Failed+to+Load";
                        }}
                      />
                      {malpractice.malpracticeImageUrl && (
                        <div className="additional-badge">Additional</div>
                      )}
                    </div>

                    {malpractice.malpracticeImageUrl && (
                      <div className="violation-image-container additional">
                        <img
                          src={malpractice.malpracticeImageUrl}
                          alt={`Additional view ${index + 1}`}
                          className="violation-image additional"
                          onClick={() =>
                            openImageModal(
                              malpractice.malpracticeImageUrl!,
                              index,
                            )
                          }
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://placehold.co/400x300/3b82f6/white?text=Additional+Image";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {malpractice.alertMessage && (
                    <div className="violation-alert">
                      <AlertTriangle className="h-4 w-4" />
                      <div className="alert-content">
                        <span className="alert-label">Alert:</span>
                        <span className="alert-message">
                          {malpractice.alertMessage}
                        </span>
                      </div>
                      {malpractice.confidence && (
                        <span className="confidence-badge">
                          {Math.round(malpractice.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>
                  Violation Image {currentImageIndex + 1} of{" "}
                  {filteredImages.length}
                </span>
                {filteredImages[currentImageIndex]?.alertMessage && (
                  <span className="modal-violation-badge">
                    <AlertTriangle className="h-3 w-3" />
                    {filteredImages[currentImageIndex].alertMessage}
                  </span>
                )}
              </div>
              <button className="close-button" onClick={closeImageModal}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="modal-image-container">
              <button
                className="nav-button prev-button"
                onClick={() => navigateImage("prev")}
                disabled={filteredImages.length <= 1}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <img
                src={selectedImage}
                alt={`Violation ${currentImageIndex + 1}`}
                className="modal-image"
              />

              <button
                className="nav-button next-button"
                onClick={() => navigateImage("next")}
                disabled={filteredImages.length <= 1}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="modal-footer">
              <div className="modal-timestamp">
                <Clock className="h-4 w-4" />
                {formatTimestamp(filteredImages[currentImageIndex]?.timestamp)}
              </div>
              <div className="modal-instructions">
                Use arrow keys to navigate • Press ESC to close
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MalpracticeImages;

