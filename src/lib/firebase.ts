import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where
} from "firebase/firestore";
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

type StoredSessionRecord = Record<string, unknown> & {
  createdAt?: Timestamp | { seconds?: number };
  timestamp?: string;
  userId?: string;
};

function getFirebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase configuration is incomplete.");
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

function normalizeSession(id: string, data: StoredSessionRecord) {
  const createdAtIso =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.timestamp ?? new Date().toISOString();

  return {
    id,
    ...data,
    timestamp: typeof data.timestamp === "string" ? data.timestamp : createdAtIso,
    createdAt: createdAtIso
  };
}

export async function logTriageSession(sessionData: Record<string, unknown>) {
  const db = getDb();
  const docRef = await addDoc(collection(db, "medlens_sessions"), {
    ...sessionData,
    createdAt: Timestamp.now()
  });

  return docRef.id;
}

export async function deleteTriageSession(sessionId: string, userId: string) {
  const db = getDb();
  const sessionRef = doc(db, "medlens_sessions", sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return { deleted: false };
  }

  const data = snapshot.data() as StoredSessionRecord;
  if (data.userId !== userId) {
    throw new Error("Unauthorized history delete request.");
  }

  await deleteDoc(sessionRef);
  return { deleted: true };
}

export async function getTriageHistory(userId: string) {
  const db = getDb();
  const collectionRef = collection(db, "medlens_sessions");

  try {
    const snapshot = await getDocs(
      query(collectionRef, where("userId", "==", userId), orderBy("createdAt", "desc"))
    );

    return snapshot.docs.map((entry) => normalizeSession(entry.id, entry.data() as StoredSessionRecord));
  } catch {
    const snapshot = await getDocs(query(collectionRef, where("userId", "==", userId)));
    return snapshot.docs
      .map((entry) => normalizeSession(entry.id, entry.data() as StoredSessionRecord))
      .sort((left, right) => {
        const leftValue = new Date(String(left.createdAt)).getTime();
        const rightValue = new Date(String(right.createdAt)).getTime();
        return rightValue - leftValue;
      });
  }
}
