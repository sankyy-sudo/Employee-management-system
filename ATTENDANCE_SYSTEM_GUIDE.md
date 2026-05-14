# Attendance System - Complete Implementation Guide

## 🎯 Overview
Multi-method employee attendance system supporting:
- **Face Recognition Attendance** (Webcam-based)
- **Biometric Fingerprint Devices**
- **RFID/Smart Card Scanning**
- **Manual & Mobile App Entry**

---

## 📁 Architecture

### Backend Structure
```
server/
├── models/
│   ├── Attendance.js           # Unified attendance records
│   ├── BiometricDevice.js      # Fingerprint device management
│   ├── RFIDCard.js             # Card management
│   └── User.js                 # Profile + face embeddings
│
├── controllers/
│   ├── attendanceController.js # Face recognition & attendance
│   ├── profileController.js    # Profile image upload
│   ├── biometricController.js  # Biometric device APIs
│   └── rfidController.js       # RFID card APIs
│
├── routes/
│   ├── attendanceRoutes.js
│   ├── profileRoutes.js
│   ├── biometricRoutes.js
│   └── rfidRoutes.js
│
└── utils/
    ├── faceRecognition.js      # Face matching, liveness detection
    └── faceMatch.js            # Embedding distance calculation
```

### Frontend Components
```
client/src/components/
├── ProfileImageUpload.jsx      # Employee profile photos
├── FaceRecognitionAttendance.jsx # Webcam attendance
├── RFIDCardScanning.jsx        # Card scanning interface
└── AttendanceHistory.jsx       # Attendance logs & reports
```

---

## 🔐 API Endpoints

### Profile Management
```
POST   /api/profile/image              - Upload profile image
GET    /api/profile/image/:userId      - Get profile image
DELETE /api/profile/image              - Delete profile image
GET    /api/profile/all                - Get all employee profiles (admin)
```

### Face Recognition
```
POST   /api/attendance/enroll-face     - Register face embedding
POST   /api/attendance/mark            - Mark attendance with face recognition
GET    /api/attendance                 - Get attendance history
GET    /api/attendance/summary         - Get attendance summary
```

### Biometric Devices
```
POST   /api/biometric/devices                    - Register device
PUT    /api/biometric/devices/:deviceId/status   - Update device status
GET    /api/biometric/devices                    - Get all devices
GET    /api/biometric/devices/:deviceId          - Get device details
PUT    /api/biometric/devices/:deviceId          - Update configuration
POST   /api/biometric/devices/:deviceId/assign   - Assign employees
POST   /api/biometric/attendance                 - Record attendance
GET    /api/biometric/devices/:deviceId/logs     - Get device logs
```

### RFID Card Management
```
POST   /api/rfid/cards                    - Issue new card
POST   /api/rfid/scan                     - Scan card for attendance
GET    /api/rfid/cards                    - Get all cards (admin)
GET    /api/rfid/cards/employee/:id       - Get employee's card
PUT    /api/rfid/cards/:cardId/lost       - Report card lost
POST   /api/rfid/cards/:cardId/replace    - Issue replacement
GET    /api/rfid/cards/:cardId/history    - Get card usage
```

---

## 🖥️ Hardware Integration Architecture

### 1. Biometric Fingerprint Devices

#### Supported Devices
- **ZKTeco**: ZK-MB360, MB100, F2, U100
- **Suprema**: BioStation 2, RealScan G10
- **Mantra**: MFS100, MFS500, MFS650
- **Nitgen**: Fingkey Hamster, Esolink, Fingkey Iface

#### Integration Flow
```
┌─────────────────┐
│ Fingerprint     │
│ Device          │
└────────┬────────┘
         │ (USB/Ethernet/TCP)
         ↓
┌─────────────────────────┐
│ Node Hardware Service   │ ← New Service Required
│ (device-service.js)     │
└────────┬────────────────┘
         │ (WebSocket/REST)
         ↓
┌─────────────────────────┐
│ Backend API Server      │
│ /api/biometric/...      │
└────────┬────────────────┘
         │ (REST API)
         ↓
┌─────────────────────────┐
│ Database (MongoDB)      │
│ - Attendance Records    │
│ - Device Configs        │
└─────────────────────────┘
```

#### Device Service Implementation (Node.js)
```javascript
// device-service.js
import Device from 'zklib'; // Or respective SDK

class BiometricDeviceService {
  async connectDevice(deviceConfig) {
    const device = new Device({
      ip: deviceConfig.ipAddress,
      port: deviceConfig.port || 5005,
      inPort: deviceConfig.inPort || 5005,
      outPort: deviceConfig.outPort || 5005
    });
    
    await device.connect();
    return device;
  }

  async recordAttendance(device, callback) {
    // Listen for biometric scans
    device.on('data:fingerprint', async (data) => {
      const { uid, timestamp } = data;
      
      // Send to backend API
      await fetch('http://backend:5000/api/biometric/attendance', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: device.config.deviceId,
          employeeId: uid,
          scanQuality: data.quality,
          action: 'checkin'
        })
      });
    });
  }

  async updateDeviceStatus(device) {
    setInterval(async () => {
      const status = await device.getStatus();
      await fetch('http://backend:5000/api/biometric/devices/:deviceId/status', {
        method: 'PUT',
        body: JSON.stringify({
          isOnline: true,
          ipAddress: device.config.ip
        })
      });
    }, 30000); // Every 30 seconds
  }
}
```

#### Installation Steps
```bash
# 1. Install device SDKs
npm install zklib mantra-biometric

# 2. Run device service
node device-service.js

# 3. Configure in admin panel
POST /api/biometric/devices
{
  "deviceId": "ZK-001",
  "deviceName": "Main Entrance",
  "deviceType": "fingerprint_scanner",
  "manufacturer": "ZKTeco",
  "model": "ZK-MB360",
  "ipAddress": "192.168.1.100",
  "port": 5005
}
```

---

### 2. RFID/Smart Card Devices

#### Supported Readers
- **USB RFID Readers**: ACR122U, PN532
- **Desktop Readers**: Omnikey, Gemalto
- **Mobile**: NFC-enabled phones

#### Card Types
- **Proximity Cards** (125kHz): T5577, EM4100
- **Contact Cards** (ISO 7816)
- **Smart Cards** (Mifare, DESFire)
- **NFC Cards** (NTAG, Mifare)

#### Integration Flow
```
┌──────────────┐
│ RFID Reader  │
│ (USB/Serial) │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ Browser/Kiosk App    │
│ RFIDCardScanning.jsx │ ← Frontend Component
└──────┬───────────────┘
       │ (REST API)
       ↓
┌──────────────────────┐
│ Backend API          │
│ POST /api/rfid/scan  │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Database             │
│ - RFIDCard Records   │
│ - Attendance Logs    │
└──────────────────────┘
```

#### Browser Implementation (Kiosk Mode)
```html
<!-- rfid-kiosk.html -->
<html>
<body>
  <input id="rfidInput" placeholder="Scan RFID Card" />
  <script>
    const input = document.getElementById('rfidInput');
    
    input.addEventListener('change', async (e) => {
      const cardNumber = e.target.value;
      
      const response = await fetch('/api/rfid/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, action: 'checkin' })
      });
      
      const data = await response.json();
      console.log(`${data.employee.name} - ${data.attendance.status}`);
      
      e.target.value = ''; // Clear for next scan
    });
  </script>
</body>
</html>
```

#### Card Generation
```bash
# Use NXP PN532 SDK or similar
npm install nfc-writer

# Generate card IDs
POST /api/rfid/cards
{
  "employeeId": "emp-123",
  "cardType": "proximity",
  "expiryYears": 2
}
# Returns: cardId, cardNumber for printing
```

---

### 3. Face Recognition Setup

#### Required Libraries
```bash
npm install @vladmandic/face-api
npm install ml5  # Alternative lighter option
npm install @tensorflow/tfjs @tensorflow/tfjs-core

# For facial feature detection
npm install @mediapipe/holistic
```

#### Frontend Integration
```javascript
// faceRecognition.js
import * as faceapi from '@vladmandic/face-api';

async function initializeModels() {
  const MODEL_URL = '/models/';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  ]);
}

async function generateEmbedding(video) {
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  return detections[0]?.descriptor; // 128-dim array
}

async function matchFace(capturedEmbedding, storedEmbedding) {
  const distance = faceapi.euclideanDistance(
    capturedEmbedding,
    storedEmbedding
  );
  
  return distance < 0.6; // Threshold
}
```

#### Liveness Detection
```javascript
async function detectLiveness(videoElement, frames = 5) {
  const detections = [];
  
  for (let i = 0; i < frames; i++) {
    const detection = await faceapi
      .detectSingleFace(videoElement)
      .withFaceExpressions();
    
    detections.push(detection);
    await delay(200);
  }
  
  // Check for blinks (closed eyes)
  const blinks = detections.filter(d => d.expressions.closed > 0.5).length;
  
  // Check for head movement
  const positions = detections.map(d => ({
    x: d.detection.box.x,
    y: d.detection.box.y
  }));
  
  const movement = Math.max(
    ...positions.map((p, i) => {
      if (i === 0) return 0;
      return Math.sqrt(
        Math.pow(p.x - positions[i-1].x, 2) +
        Math.pow(p.y - positions[i-1].y, 2)
      );
    })
  );
  
  return {
    isLive: blinks >= 2 && movement > 5,
    confidence: blinks >= 2 ? 95 : 40
  };
}
```

---

## 🛠️ Hardware Device Setup

### Fingerprint Scanner Setup
```bash
# 1. Install drivers
# Windows: Download from ZKTeco/device manufacturer
# Linux: sudo apt-get install libusb-dev libusb-1.0

# 2. Configure device service
PORT=3001
DEVICE_IP=192.168.1.100
DEVICE_PORT=5005

# 3. Test connection
curl -X PUT http://localhost:3001/device/status

# 4. Start monitoring
node device-service.js
```

### RFID Reader Setup
```bash
# 1. USB Device
# - Connect ACR122U or PN532 reader
# - Test with nfc-writer library
npm install nfc-writer
node -e "require('nfc-writer').list()"

# 2. Configure Kiosk
# - Set up dedicated computer/tablet
# - Browser in full-screen kiosk mode
# - Point to RFID scanning page
# - Configure single input field focus

# 3. Card Generation
# Use manufacturer's software or:
npm run generate-cards
```

### Webcam Setup (Face Recognition)
```bash
# 1. Browser Requirements
# - HTTPS or localhost
# - Camera permission granted
# - Modern browser (Chrome 86+, Firefox 55+)

# 2. Test webcam
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log(devices))

# 3. Deploy models
# Place TensorFlow models in /public/models/
# Download from: https://github.com/vladmandic/face-api
```

---

## 📊 Database Schema

### Attendance Record
```javascript
{
  _id: ObjectId,
  userId: ObjectId,      // Employee reference
  date: Date,
  
  // Check-in/out times
  checkIn: Date,
  checkOut: Date,
  
  // Status
  status: "Present|Late|Half-day|Absent|On Leave|Remote",
  method: "face_recognition|biometric|rfid_card|manual",
  
  // Face recognition data
  faceData: {
    embedding: [Number], // 128-dim vector
    matchScore: Number,  // 0-100
    livenessDetected: Boolean,
    imageProof: String,  // File path
    verificationMethod: "auto|manual"
  },
  
  // Biometric data
  biometricData: {
    deviceId: String,
    fingerprint: String, // Hash
    scanQuality: Number  // 0-100
  },
  
  // RFID data
  rfidData: {
    cardId: String,
    cardNumber: String,
    cardType: "proximity|contact|smart|nfc"
  },
  
  // Location
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  
  // Security
  ipAddress: String,
  deviceInfo: String,
  
  // Audit
  isEdited: Boolean,
  editedBy: ObjectId,
  editedAt: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Deployment Checklist

- [ ] Database setup (MongoDB)
- [ ] Backend server running on port 5000
- [ ] Frontend build & deployment
- [ ] File upload directory permissions
- [ ] WebSocket configuration
- [ ] Face API models downloaded
- [ ] Biometric device service running
- [ ] RFID reader calibrated
- [ ] Webcam permissions tested
- [ ] SSL/HTTPS configured
- [ ] Admin dashboard setup
- [ ] Employee data migration

---

## 🔧 Troubleshooting

### Face Recognition Issues
- **No face detected**: Ensure good lighting, clear face view
- **Low match score**: Re-register face, try multiple angles
- **Liveness failed**: Move head slightly, blink visibly
- **Camera access denied**: Check browser permissions, use HTTPS

### Biometric Device Issues
- **Device offline**: Check network connectivity, USB connection
- **No scans recorded**: Verify employee assignment, device configuration
- **Poor scan quality**: Clean scanner, check fingers

### RFID Issues
- **Card not recognized**: Verify card format, reader compatibility
- **Duplicate scans**: Check delay window settings
- **Card not found**: Verify card issuance, database sync

---

## 📱 Mobile App Integration

For mobile attendance:
```
POST /api/attendance/mark-mobile
{
  "method": "mobile_app",
  "location": { "latitude": 28.6139, "longitude": 77.2090 },
  "faceEmbedding": [...],
  "deviceInfo": "iPhone 13"
}
```

---

## 🔒 Security Considerations

1. **Face Embeddings**: Stored encrypted, never transmit face images
2. **Biometric Data**: Never store actual fingerprints, use secure hashes
3. **RFID Cards**: Encrypted card numbers, time-limited access
4. **Location Data**: Optional, only with employee consent
5. **API Security**: Rate limiting, IP whitelist for devices
6. **Audit Logs**: All attendance changes tracked

---

## 📞 Support & References

- **Face API**: https://github.com/vladmandic/face-api
- **ZKTeco SDK**: https://github.com/gugod/zklib
- **NFC Writers**: https://github.com/nfc-tools/nfc-writer
- **MediaPipe**: https://mediapipe.dev/
