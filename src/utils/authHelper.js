/**
 * lib/authHelper.js
 * Central auth + profile-provisioning logic against the Firebase v9/v10
 * modular SDK. Keeps all Firebase calls out of UI components.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/libs/firebase";
import { generateUSAccountNumber } from "@/utils/Cryptogenacc";

/**
 * Registers a new user, provisions an institutional account number, and
 * writes their full KYC-style profile document to Firestore under
 * `profiles/{uid}`.
 *
 * @param {string} email
 * @param {string} password
 * @param {Object} profile
 * @param {string} profile.fullName
 * @param {string} profile.dateOfBirth - ISO date string, e.g. "1998-04-12"
 * @param {string} profile.gender
 * @param {string} profile.country - Country of residence
 * @param {string} profile.mobileNumber
 * @param {string} profile.accountType - e.g. "Personal Checking"
 * @returns {Promise<{ user: import("firebase/auth").User, accountNumber: string }>}
 */
export async function signUpUser(email, password, profile) {
  const {
    fullName,
    dateOfBirth = "",
    gender = "",
    country = "",
    mobileNumber = "",
    accountType = "",
  } = profile || {};

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = credential.user;

  const accountNumber = generateUSAccountNumber();

  // Best-effort — a failure here shouldn't block account creation.
  if (fullName) {
    try {
      await updateProfile(user, { displayName: fullName });
    } catch (profileError) {
      console.error("Failed to set display name:", profileError);
    }
  }

  await setDoc(doc(db, "profiles", user.uid), {
    userId: user.uid,
    name: fullName,
    email,
    dateOfBirth,
    gender,
    country,
    mobileNumber,
    accountType,
    accountNumber,
    createdAt: serverTimestamp(),
    avatarUrl: "",
    role: "user",
  });

  return { user, accountNumber };
}

/**
 * Authenticates an existing user with email + password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").User>}
 */
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Terminates the active session.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  await signOut(auth);
}
