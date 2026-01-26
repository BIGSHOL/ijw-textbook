import { FIRESTORE_BASE_URL } from './firebase-config.js';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_STATUS') {
    handleSyncStatus(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'GET_REQUESTS') {
    getUncompletedRequests()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'CHECK_CONNECTION') {
    checkFirestoreConnection()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Check Firestore connection status
 */
async function checkFirestoreConnection() {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/settings/default-account`);
    if (response.ok || response.status === 404) {
      return { success: true, connected: true };
    }
    return { success: false, connected: false, error: 'Connection failed' };
  } catch (error) {
    return { success: false, connected: false, error: error.message };
  }
}

/**
 * Get all uncompleted requests from Firestore with status counts
 */
async function getUncompletedRequests() {
  try {
    const url = `${FIRESTORE_BASE_URL}/requests`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Firestore error: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.documents || [];

    // Parse all documents
    const allRequests = documents.map(doc => parseFirestoreDocument(doc)).filter(req => req);

    // Count uncompleted statuses
    let notRegistered = 0;
    let notPaid = 0;
    let notOrdered = 0;

    allRequests.forEach(req => {
      if (!req.isCompleted) notRegistered++;
      if (!req.isPaid) notPaid++;
      if (!req.isOrdered) notOrdered++;
    });

    // Filter uncompleted requests
    const requests = allRequests.filter(req => !req.isCompleted || !req.isPaid || !req.isOrdered);

    return {
      success: true,
      requests,
      counts: {
        notRegistered,
        notPaid,
        notOrdered,
        total: allRequests.length
      }
    };
  } catch (error) {
    console.error('Error fetching requests:', error);
    return {
      success: false,
      error: error.message,
      requests: [],
      counts: { notRegistered: 0, notPaid: 0, notOrdered: 0, total: 0 }
    };
  }
}

/**
 * Handle sync status update from MakeEdu
 */
async function handleSyncStatus(data) {
  const { studentName, bookName, isPaid } = data;

  try {
    // Find matching request
    const matchResult = await findMatchingRequest(studentName, bookName);

    if (!matchResult.found) {
      return {
        success: false,
        error: `매칭되는 학생을 찾을 수 없습니다: ${studentName}`,
        notFound: true
      };
    }

    if (matchResult.multiple) {
      return {
        success: false,
        error: '동명이인이 있습니다. 선택이 필요합니다.',
        multiple: true,
        candidates: matchResult.candidates
      };
    }

    // Update the matched document
    const updateResult = await updateRequestStatus(matchResult.docId, {
      isCompleted: true,
      isPaid: isPaid,
      completedAt: new Date().toISOString(),
      ...(isPaid && { paidAt: new Date().toISOString() })
    });

    if (updateResult.success) {
      // Save to sync history
      await saveSyncHistory({
        studentName,
        bookName,
        isCompleted: true,  // Always set to true when syncing
        isPaid,
        syncedAt: new Date().toISOString()
      });
    }

    return updateResult;
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Normalize string for comparison (remove spaces, lowercase)
 */
function normalizeString(str) {
  if (!str) return '';
  return str.replace(/\s+/g, '').toLowerCase();
}

/**
 * Find a matching request by student name AND book name (both required)
 */
async function findMatchingRequest(studentName, bookName) {
  try {
    const url = `${FIRESTORE_BASE_URL}/requests`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Firestore error: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.documents || [];

    const normalizedStudentName = normalizeString(studentName);
    const normalizedBookName = normalizeString(bookName);

    // Parse all documents
    const allParsed = documents.map(doc => ({
      docId: doc.name.split('/').pop(),
      ...parseFirestoreDocument(doc)
    })).filter(req => req && req.studentName);

    // Must match BOTH student name AND book name
    const matches = allParsed.filter(req => {
      const nameMatch = normalizeString(req.studentName) === normalizedStudentName;
      if (!nameMatch) return false;

      // Book name must also match (partial match allowed)
      if (!bookName || !req.bookName) return false;

      const reqBookName = normalizeString(req.bookName);
      const bookMatch = reqBookName.includes(normalizedBookName) ||
                        normalizedBookName.includes(reqBookName);

      return bookMatch;
    });

    if (matches.length === 0) {
      return { found: false };
    }

    if (matches.length === 1) {
      return { found: true, docId: matches[0].docId, request: matches[0] };
    }

    // Multiple matches - return candidates for user selection
    return {
      found: true,
      multiple: true,
      candidates: matches.map(m => ({
        docId: m.docId,
        studentName: m.studentName,
        bookName: m.bookName,
        teacherName: m.teacherName,
        createdAt: m.createdAt
      }))
    };
  } catch (error) {
    console.error('Error finding request:', error);
    throw error;
  }
}

/**
 * Update request status in Firestore
 */
async function updateRequestStatus(docId, updates) {
  try {
    const url = `${FIRESTORE_BASE_URL}/requests/${docId}?updateMask.fieldPaths=isCompleted&updateMask.fieldPaths=isPaid&updateMask.fieldPaths=completedAt&updateMask.fieldPaths=paidAt`;

    const firestoreUpdates = {
      fields: {}
    };

    if (updates.isCompleted !== undefined) {
      firestoreUpdates.fields.isCompleted = { booleanValue: updates.isCompleted };
    }
    if (updates.isPaid !== undefined) {
      firestoreUpdates.fields.isPaid = { booleanValue: updates.isPaid };
    }
    if (updates.completedAt) {
      firestoreUpdates.fields.completedAt = { stringValue: updates.completedAt };
    }
    if (updates.paidAt) {
      firestoreUpdates.fields.paidAt = { stringValue: updates.paidAt };
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firestoreUpdates)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update failed: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Parse Firestore document to plain object
 */
function parseFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null;

  const result = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

/**
 * Parse Firestore value types
 */
function parseFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    return parseFirestoreDocument({ fields: value.mapValue.fields });
  }
  return null;
}

/**
 * Save sync history to chrome.storage
 */
async function saveSyncHistory(entry) {
  try {
    const result = await chrome.storage.local.get(['syncHistory']);
    const history = result.syncHistory || [];
    history.unshift(entry);
    // Keep only last 50 entries
    const trimmedHistory = history.slice(0, 50);
    await chrome.storage.local.set({ syncHistory: trimmedHistory });
  } catch (error) {
    console.error('Error saving sync history:', error);
  }
}
