import { useQuery } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
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
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  malpractice: MalpracticeImage[];
  test_attempts: Array<{
    test_status: string;
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

  const {
    data: candidate,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchApplicantData(id as string),
    enabled: !!id, 
    refetchInterval: 30000, 
  });

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Handle image modal
  const openImageModal = (imageUrl: string, index: number) => {
    setSelectedImage(imageUrl);
    setCurrentImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: string) => {
    const images = candidate?.malpractice || [];
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
  }, [selectedImage, currentImageIndex]);

  if (isLoading) {
    return (
      <div className="malpractice-loading">
        <div className="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="malpractice-error">
        <div className="error-content">
          <XCircle className="h-8 w-8 text-red-600" />
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
          <h3>Candidate not found</h3>
          <p>The requested candidate could not be found.</p>
          <button onClick={() => navigate("/results")} className="back-button">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const malpracticeImages = candidate.malpractice || [];

  return (
    <div className="malpractice-container">
      {/* Header */}
      <button onClick={() => navigate("/results")} className="back-button">
        ← Back to Results
      </button>
      <div className="malpractice-header">
        <div className="header-content">
          <div className="malpractice-title">
            <h1>Proctoring Images - {candidate.name}</h1>
            <div className="image-count">
              {malpracticeImages.length}{" "}
              {malpracticeImages.length === 1 ? "Image" : "Images"} Captured
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Info */}
      <div className="candidate-info">
        <div className="info-card">
          <div className="info-item">
            <label>Candidate:</label>
            <span>{candidate.name}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{candidate.email}</span>
          </div>
          <div className="info-item">
            <label>Test Status:</label>
            <span className="test-status">
              {candidate.test_attempts[0]?.test_status || "N/A"}
            </span>
          </div>
          <div className="info-item">
            <label>Images Captured:</label>
            <span className="image-count-badge">
              {malpracticeImages.length}
            </span>
          </div>
        </div>
      </div>

      {/* Images Content */}
      {malpracticeImages.length === 0 ? (
        <div className="no-images">
          <div className="no-images-content">
            <div className="no-images-icon">📷</div>
            <h3>No Images Captured</h3>
            <p>
              No proctoring images were captured for this candidate during the
              assessment.
            </p>
          </div>
        </div>
      ) : (
        <div className="images-content">
          <div className="images-header">
            <h2>Captured Images Timeline</h2>
            <p>Images captured during the assessment session</p>
          </div>

          <div className="images-grid">
            {malpracticeImages.map((malpractice: MalpracticeImage, index: number) => (
              <div key={malpractice.id} className="image-card">
                <div className="image-header">
                  <div className="image-number">Image #{index + 1}</div>
                  <div className="image-timestamp">
                    {formatTimestamp(malpractice.timestamp)}
                  </div>
                </div>

                <div className="image-container">
                  <img
                    src={malpractice.profileImageUrl}
                    alt={`Proctoring image ${index + 1} for ${candidate.name}`}
                    className="proctoring-image"
                    onClick={() =>
                      openImageModal(malpractice.profileImageUrl, index)
                    }
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const next = target.nextSibling as HTMLElement | null; 
                      if (next) next.style.display = "flex"; 
                    }}
                  />
                  <div className="image-error" style={{ display: "none" }}>
                    <div className="error-icon">⚠️</div>
                    <p>Image failed to load</p>
                  </div>
                </div>

                {malpractice.alertMessage && (
                  <div className="alert-message">
                    <div className="alert-icon">⚠️</div>
                    <p>{malpractice.alertMessage}</p>
                  </div>
                )}

                {malpractice.malpracticeImageUrl && (
                  <div className="malpractice-image-container">
                    <h4>Additional Image:</h4>
                    <img
                      src={malpractice.malpracticeImageUrl}
                      alt={`Additional proctoring image ${index + 1}`}
                      className="additional-image"
                      onClick={() =>
                        openImageModal(malpractice.malpracticeImageUrl!, index)
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                Image {currentImageIndex + 1} of {malpracticeImages.length}
              </div>
              <button className="close-button" onClick={closeImageModal}>
                ✕
              </button>
            </div>

            <div className="modal-image-container">
              <button
                className="nav-button prev-button"
                onClick={() => navigateImage("prev")}
                disabled={malpracticeImages.length <= 1}
              >
                ‹
              </button>

              <img
                src={selectedImage}
                alt={`Proctoring image ${currentImageIndex + 1}`}
                className="modal-image"
              />

              <button
                className="nav-button next-button"
                onClick={() => navigateImage("next")}
                disabled={malpracticeImages.length <= 1}
              >
                ›
              </button>
            </div>

            <div className="modal-info">
              <div className="modal-timestamp">
                {formatTimestamp(
                  malpracticeImages[currentImageIndex]?.timestamp
                )}
              </div>
              {malpracticeImages[currentImageIndex]?.alertMessage && (
                <div className="modal-alert">
                  <span className="alert-icon">⚠️</span>
                  {malpracticeImages[currentImageIndex].alertMessage}
                </div>
              )}
            </div>

            <div className="modal-instructions">
              <p>Use arrow keys to navigate • Press ESC to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MalpracticeImages;