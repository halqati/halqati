
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, updateEmail, verifyBeforeUpdateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp, Timestamp, arrayUnion, arrayRemove, addDoc, runTransaction, writeBatch, deleteField } from 'firebase/firestore';

// We will use environment variables for Firebase configuration.
// These should be set in the AI Studio settings.
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase only if we have the minimum required config
let app: any;
let auth: any;
let db: any;

const isFirebaseConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

try {
  if (isFirebaseConfigValid) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = 'ar';
    
    // Set persistence to LOCAL by default to ensure session stays after app restart
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Error setting persistence in init:", err);
    });

    // Use initializeFirestore for better consistency and multi-tab support configuration
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        }),
        // Avoid potential issues with large documents or complexes queries in offline mode
        ignoreUndefinedProperties: true
    }, firebaseConfig.firestoreDatabaseId || '(default)');
  } else {
    console.warn("Firebase configuration is missing required fields (apiKey, projectId, appId). Please check firebase-applet-config.json.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const loginWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your API key and configuration in AI Studio settings.");
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/api-key-not-valid') {
      throw new Error("The Firebase API key provided is invalid. Please verify it in AI Studio settings.");
    }
    console.error("Login failed:", error);
    throw error;
  }
};

const logoutUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

const loginWithUsername = async (username: string, password: string) => {
  if (!auth) throw new Error("Firebase is not initialized.");
  const email = username.includes('@') ? username.trim() : `${username.toLowerCase().trim()}@quran.app`;
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error("Login failed:", error);
    throw error;
  }
};

const resetPassword = async (email: string) => {
  if (!auth) throw new Error("Firebase is not initialized.");
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Password reset failed:", error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { auth, db, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, loginWithGoogle, logoutUser, loginWithUsername, resetPassword, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp, Timestamp, arrayUnion, arrayRemove, addDoc, runTransaction, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, updateEmail, verifyBeforeUpdateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, writeBatch, deleteField };
export type { User };
