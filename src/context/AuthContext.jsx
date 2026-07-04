"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/libs/firebase";
import { logoutUser as firebaseLogoutUser } from "@/utils/authHelper";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  logoutUser: async () => {},
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState({ user: null, profile: null, loading: false });
        return;
      }

      try {
        // Fetch document EXACTLY ONCE upon authentication change
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);

        setAuthState({
          user,
          profile: profileSnap.exists() ? profileSnap.data() : null,
          loading: false,
        });
      } catch (error) {
        console.error("Context synchronization error:", error);
        setAuthState({ user, profile: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  // Wrapped so consumers get one call that both terminates the Firebase
  // session AND clears local context memory immediately — not waiting on
  // the onAuthStateChanged round-trip, which still fires afterward as a
  // safety net.
  async function logoutUser() {
    await firebaseLogoutUser();
    setAuthState({ user: null, profile: null, loading: false });
  }

  return (
    <AuthContext.Provider value={{ ...authState, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
