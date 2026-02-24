// Similarity thresholds
export const SIMILARITY_THRESHOLDS = {
  PRE_TEST_VERIFICATION: 0.80,  // For initial verification before test
  LIVE_PROCTORING: 0.72,        // During test continuous monitoring
} as const;

// Face coverage requirements
export const FACE_REQUIREMENTS = {
  MIN_COVERAGE: 20,              // Minimum face coverage percentage
  MAX_X_OFFSET: 20,              // Maximum horizontal offset percentage
  MAX_Y_OFFSET: 20,              // Maximum vertical offset percentage
} as const;

// Detection intervals
export const DETECTION_INTERVALS = {
  PASSIVE_DETECTION: 1000,       // 1 second for passive detection
  LIVE_PROCTORING: 3000,         // 3 seconds for live proctoring
} as const;

// Malpractice limits
export const MALPRACTICE_LIMITS = {
  MAX_COUNT: 7,                   // Maximum violations before auto-submit
} as const;