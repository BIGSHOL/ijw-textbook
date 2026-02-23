import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, updateDoc, deleteDoc, startAfter, DocumentData, QueryDocumentSnapshot, getCountFromServer, where } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { SavedTextbookRequest } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCDDAnbtu7HDM3JUbFf4jKSH4mS6GYYPkI",
  authDomain: "ijw-calander.firebaseapp.com",
  projectId: "ijw-calander",
  storageBucket: "ijw-calander.firebasestorage.app",
  messagingSenderId: "231563652148",
  appId: "1:231563652148:web:4a217812ef96fa3aae2e61"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'restore260202');
export const storage = getStorage(app);

// Account Settings
const SETTINGS_DOC_ID = 'textbook-account';

export interface AccountSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export const getAccountSettings = async (): Promise<AccountSettings> => {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as AccountSettings;
    }
    return { bankName: '', accountNumber: '', accountHolder: '' };
  } catch (error) {
    console.error('Error loading account settings:', error);
    return { bankName: '', accountNumber: '', accountHolder: '' };
  }
};

export const saveAccountSettings = async (settings: AccountSettings): Promise<boolean> => {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(docRef, settings);
    return true;
  } catch (error) {
    console.error('Error saving account settings:', error);
    return false;
  }
};

// --- Textbook List (Server-synced) ---

import { TextbookDef } from '../data/textbooks';

export const getTextbooksFromFirestore = async (): Promise<TextbookDef[] | null> => {
  try {
    const docRef = doc(db, 'settings', 'textbooks');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().list as TextbookDef[];
    }
    return null; // No server data yet
  } catch (error) {
    console.error('Error loading textbooks:', error);
    return null;
  }
};

export const saveTextbooksToFirestore = async (textbooks: TextbookDef[]): Promise<boolean> => {
  try {
    const docRef = doc(db, 'settings', 'textbooks');
    await setDoc(docRef, { list: textbooks, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving textbooks:', error);
    return false;
  }
};

// --- Students & Teachers (자동완성용) ---

export interface StudentOption {
  id: string;
  name: string;
  grade: string;
  school: string;
}

export interface TeacherOption {
  id: string;
  name: string;
  subjects: string[];
}

export const getStudentList = async (): Promise<StudentOption[]> => {
  try {
    const q = query(collection(db, 'students'), where('status', '!=', 'withdrawn'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || '',
        grade: data.grade || '',
        school: data.school || '',
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } catch (error) {
    console.error('Error loading students:', error);
    return [];
  }
};

export const getTeacherList = async (): Promise<TeacherOption[]> => {
  try {
    const q = query(collection(db, 'staff'), where('role', '==', 'teacher'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || '',
        subjects: data.subjects || [],
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } catch (error) {
    console.error('Error loading teachers:', error);
    return [];
  }
};

// --- History & Storage Logic ---

/**
 * Uploads a base64 image string to Firebase Storage
 */
export const uploadImageToStorage = async (dataUrl: string, fileName: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `requests/${fileName}`);
    await uploadString(storageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

/**
 * Saves a new textbook request to Firestore
 */
export const saveRequestToFirestore = async (request: SavedTextbookRequest) => {
  try {
    // We use the ID from the local object, or let Firestore generate one?
    // User logic currently generates a timestamp-based ID. Let's use that as the Doc ID or a field.
    // To ensure consistency, let's use the request.id as the document ID if possible, 
    // BUT common practice is to let Firestore generate IDs or use setDoc with custom ID.
    // Given we want to use the same ID, we use setDoc.
    const docRef = doc(db, 'textbook_requests', request.id);
    await setDoc(docRef, request);
    return true;
  } catch (error) {
    console.error("Error saving request:", error);
    throw error;
  }
};

/**
 * Fetches requests with page-based pagination
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 */
export const getRequestsFromFirestore = async (page: number = 1, pageSize: number = 20) => {
  try {
    // First, get total count for pagination info
    const countQuery = query(collection(db, 'textbook_requests'));
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch all and slice for page (simpler approach for small datasets)
    // For large datasets, you'd want to use cursors, but this works for typical use
    const q = query(
      collection(db, 'textbook_requests'),
      orderBy('createdAt', 'desc'),
      limit(page * pageSize)
    );

    const querySnapshot = await getDocs(q);
    const allRequests: SavedTextbookRequest[] = [];
    querySnapshot.forEach((doc) => {
      allRequests.push(doc.data() as SavedTextbookRequest);
    });

    // Slice for the current page
    const startIndex = (page - 1) * pageSize;
    const requests = allRequests.slice(startIndex, startIndex + pageSize);

    return {
      requests,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  } catch (error) {
    console.error("Error getting requests:", error);
    throw error;
  }
};

/**
 * Check if a request is fully completed (all 3 statuses checked)
 */
const isFullyCompleted = (data: SavedTextbookRequest) => {
  return !!data.isCompleted && !!data.isPaid && !!data.isOrdered;
};

/**
 * Fetches requests filtered by completion status with pagination
 * @param filter 'incomplete' | 'complete'
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 */
export const getFilteredRequestsFromFirestore = async (
  filter: 'incomplete' | 'complete',
  page: number = 1,
  pageSize: number = 20
) => {
  try {
    // Fetch all requests and filter locally (Firestore doesn't support OR queries well)
    const q = query(
      collection(db, 'textbook_requests'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const allRequests: SavedTextbookRequest[] = [];
    querySnapshot.forEach((doc) => {
      allRequests.push(doc.data() as SavedTextbookRequest);
    });

    // Filter by completion status
    const filteredRequests = allRequests.filter(req => {
      const complete = isFullyCompleted(req);
      return filter === 'complete' ? complete : !complete;
    });

    const totalCount = filteredRequests.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Slice for the current page
    const startIndex = (page - 1) * pageSize;
    const requests = filteredRequests.slice(startIndex, startIndex + pageSize);

    return {
      requests,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  } catch (error) {
    console.error("Error getting filtered requests:", error);
    throw error;
  }
};

/**
 * Updates request fields
 */
export const updateRequest = async (id: string, updates: Partial<SavedTextbookRequest>) => {
  try {
    const docRef = doc(db, 'textbook_requests', id);
    await updateDoc(docRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating request:", error);
    throw error;
  }
};

/**
 * Deletes a request
 */
export const deleteRequestFromFirestore = async (id: string) => {
  try {
    const docRef = doc(db, 'textbook_requests', id);
    await deleteDoc(docRef);
    return true;
    // Note: This doesn't delete the image from Storage to keep it simple, 
    // but ideally we should delete the image too.
  } catch (error) {
    console.error("Error deleting request:", error);
    throw error;
  }
};
/**
 * Gets the total count of incomplete requests
 */
export const getPendingRequestCount = async () => {
  try {
    const q = query(
      collection(db, 'textbook_requests'),
      where('isCompleted', '==', false)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting pending count:", error);
    return 0;
  }
};

/**
 * Gets counts for each status (registered, paid, ordered)
 */
export const getStatusCounts = async () => {
  try {
    // Get all requests and count locally (simpler than 3 separate queries for count aggregation)
    const q = query(collection(db, 'textbook_requests'));
    const snapshot = await getDocs(q);

    let registered = 0;
    let paid = 0;
    let ordered = 0;
    let total = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      total++;
      if (!data.isCompleted) registered++;
      if (!data.isPaid) paid++;
      if (!data.isOrdered) ordered++;
    });

    return { registered, paid, ordered, total };
  } catch (error) {
    console.error("Error getting status counts:", error);
    return { registered: 0, paid: 0, ordered: 0, total: 0 };
  }
};
