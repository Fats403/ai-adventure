import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { clientApp } from "./client";

const auth = getAuth(clientApp);
const googleProvider = new GoogleAuthProvider();

// Sign up a new user
export const signUp = async (
  email: string,
  password: string,
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("User registered successfully:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    // Log specific Firebase error codes if helpful
    console.error("Firebase Sign Up Error:", error);
    throw error; // Re-throw the error for the UI to handle
  }
};

// Sign in an existing user
export const signIn = async (
  email: string,
  password: string,
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("User signed in successfully:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase Sign In Error:", error);
    throw error; // Re-throw the error
  }
};

// Sign in with Google Popup
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // This gives you a Google Access Token. You can use it to access the Google API.
    // const credential = GoogleAuthProvider.credentialFromResult(result);
    // const token = credential?.accessToken;
    // The signed-in user info.
    const user = result.user;
    console.log("User signed in with Google successfully:", user.uid);
    return user;
  } catch (error) {
    console.error("Firebase Google Sign In Error:", error);
    // Handle specific errors (e.g., popup closed, account exists with different credential)
    // const errorCode = (error as { code: string }).code;
    // const errorMessage = (error as Error).message;
    // The email of the user's account used.
    // const email = (error as { customData?: { email?: string } }).customData?.email;
    // The AuthCredential type that was used.
    // const credential = GoogleAuthProvider.credentialFromError(error as any); // Type assertion might be needed
    throw error; // Re-throw the error for the UI to handle
  }
};

// Sign out the current user
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log("User signed out successfully.");
  } catch (error) {
    console.error("Firebase Sign Out Error:", error);
    throw error; // Re-throw the error
  }
};

// Listen for authentication state changes
export const listenToAuthChanges = (callback: (user: User | null) => void) => {
  // onAuthStateChanged is often sufficient unless you specifically need the token refresh event
  return onAuthStateChanged(auth, callback);
};

// Listen for ID token changes (includes auth state changes and token refreshes)
export const listenToIdTokenChanges = (
  callback: (user: User | null) => Promise<void>,
) => {
  return onIdTokenChanged(auth, callback);
};

// Get the current user's ID token
export const getIdToken = async (
  forceRefresh = false,
): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  try {
    const token = await currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    console.error("Error getting ID token:", error);
    // Handle specific errors like 'auth/user-token-expired' if needed
    throw error; // Re-throw
  }
};
