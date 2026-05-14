import fs from "fs";
import path from "path";

/**
 * Face Recognition Utility Module
 * Integrates with face-api.js or ml5.js for face detection and matching
 * Uses embeddings for secure face matching
 */

/**
 * Generate face embedding from image/video frame
 * This is a mock implementation - replace with actual ML5.js or TensorFlow.js integration
 * In production, use: @vladmandic/face-api or ml5.js
 */
export const generateFaceEmbedding = async (imageData) => {
  try {
    // Mock embedding generation (32-dimensional vector)
    // In production, integrate with actual face recognition library
    const embedding = Array(128)
      .fill(0)
      .map(() => Math.random() * 2 - 1); // Random -1 to 1 values
    
    return {
      success: true,
      embedding,
      confidence: Math.random() * 0.4 + 0.6 // Random 0.6-1.0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate Euclidean distance between two embeddings
 * Lower distance = higher similarity
 */
export const calculateEmbeddingDistance = (embedding1, embedding2) => {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Match face with stored embeddings
 * Returns match score (0-100) where 100 is perfect match
 */
export const matchFaceWithStored = (capturedEmbedding, storedEmbeddings = [], threshold = 0.6) => {
  if (!capturedEmbedding || storedEmbeddings.length === 0) {
    return {
      isMatch: false,
      matchScore: 0,
      distance: Infinity
    };
  }

  let bestMatch = null;
  let bestScore = 0;
  let bestDistance = Infinity;

  for (const stored of storedEmbeddings) {
    const distance = calculateEmbeddingDistance(capturedEmbedding, stored);
    // Convert distance to similarity score (0-100)
    // Assuming max distance is ~5.0, adjust based on your needs
    const score = Math.max(0, 100 * (1 - distance / 5.0));

    if (score > bestScore) {
      bestScore = score;
      bestDistance = distance;
      bestMatch = stored;
    }
  }

  return {
    isMatch: bestScore >= threshold * 100,
    matchScore: Math.round(bestScore),
    distance: bestDistance,
    threshold: Math.round(threshold * 100)
  };
};

/**
 * Detect liveness in face image
 * Checks for: eye blinks, head movement, texture variations
 * Mock implementation - integrate with actual anti-spoofing library
 */
export const detectLiveness = async (imageFrames = []) => {
  try {
    // Mock liveness detection
    // In production, use anti-spoofing models like:
    // - face-liveness-detection
    // - MediaPipe FaceMesh
    // - MTCNN with anti-spoofing

    if (imageFrames.length < 5) {
      return {
        isLive: false,
        confidence: 0,
        reason: "Insufficient frames"
      };
    }

    const blinkDetected = Math.random() > 0.3; // Simulate blink detection
    const headMovement = Math.random() > 0.4; // Simulate head movement
    const textureAnalysis = Math.random() > 0.3; // Simulate texture analysis

    const isLive = blinkDetected && (headMovement || textureAnalysis);
    const confidence = Math.random() * 0.3 + 0.7; // 70-100%

    return {
      isLive,
      confidence: Math.round(confidence * 100),
      details: {
        blinkDetected,
        headMovement,
        textureAnalysis
      }
    };
  } catch (error) {
    return {
      isLive: false,
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Validate attendance based on face recognition
 * Checks for duplicates and time window constraints
 */
export const validateAttendanceEligibility = (lastAttendance, delayMinutes = 5) => {
  if (!lastAttendance) {
    return {
      eligible: true,
      reason: "No previous attendance"
    };
  }

  const now = new Date();
  const lastTime = new Date(lastAttendance);
  const minutesSinceLastAttendance = (now - lastTime) / (1000 * 60);

  if (minutesSinceLastAttendance < delayMinutes) {
    return {
      eligible: false,
      reason: `Duplicate attendance detected. Wait ${delayMinutes - Math.floor(minutesSinceLastAttendance)} minutes`,
      timeRemaining: delayMinutes - Math.floor(minutesSinceLastAttendance)
    };
  }

  return {
    eligible: true,
    reason: "Attendance eligible"
  };
};

/**
 * Save face image proof locally or to cloud storage
 */
export const saveFaceImage = async (imageData, userId, attendanceType = "checkin") => {
  try {
    const timestamp = Date.now();
    const filename = `${userId}-${attendanceType}-${timestamp}.jpg`;
    const filepath = path.join(process.cwd(), "uploads", "faces", filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // In production: save to AWS S3, Azure Blob, or GCS
    // For now: save locally (but ensure cleanup)
    if (imageData) {
      fs.writeFileSync(filepath, imageData);
    }

    return {
      success: true,
      filename,
      path: `/uploads/faces/${filename}`,
      url: `/api/uploads/faces/${filename}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate attendance status based on check-in time
 */
export const calculateAttendanceStatus = (checkInTime, lateThresholdMinutes = 15) => {
  const hour = checkInTime.getHours();
  const minutes = checkInTime.getMinutes();

  // Assume office hours start at 9:00 AM
  const officeStartHour = 9;
  const officeStartMinutes = 0;

  const checkInMinutes = hour * 60 + minutes;
  const officeStartTotalMinutes = officeStartHour * 60 + officeStartMinutes;

  const lateMinutes = checkInMinutes - officeStartTotalMinutes;

  if (lateMinutes <= 0) {
    return {
      status: "Present",
      isLate: false,
      lateMinutes: 0
    };
  }

  if (lateMinutes <= lateThresholdMinutes) {
    return {
      status: "Present",
      isLate: false,
      lateMinutes: 0
    };
  }

  if (lateMinutes <= 180) { // 3 hours
    return {
      status: "Late",
      isLate: true,
      lateMinutes
    };
  }

  return {
    status: "Half-day",
    isLate: true,
    lateMinutes
  };
};

export default {
  generateFaceEmbedding,
  calculateEmbeddingDistance,
  matchFaceWithStored,
  detectLiveness,
  validateAttendanceEligibility,
  saveFaceImage,
  calculateAttendanceStatus
};
