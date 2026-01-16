// Firebase configuration for the textbook system
export const firebaseConfig = {
  apiKey: "AIzaSyDKxS1FpGzGRhp6lP7CxO0sOsRCIYvLxZA",
  authDomain: "ijw-textbook.firebaseapp.com",
  projectId: "ijw-textbook",
  storageBucket: "ijw-textbook.firebasestorage.app",
  messagingSenderId: "151390597526",
  appId: "1:151390597526:web:559a2b47e244b92f2O6db7"
};

// Firestore REST API base URL
export const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
