"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/libs/firebase";
import { logoutUser as firebaseLogoutUser } from "@/utils/authHelper";
import { setSessionCookie, clearSessionCookie } from "@/utils/session";

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
  // Avoid re-fetching the profile doc on every token refresh — only on
  // an actual sign-in/sign-out/user-switch.
  const lastUidRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        lastUidRef.current = null;
        clearSessionCookie();
        setAuthState({ user: null, profile: null, loading: false });
        return;
      }

      try {
        const token = await user.getIdToken();
        setSessionCookie(token);

        if (lastUidRef.current === user.uid) {
          // Same user, just a refreshed token — keep the existing profile.
          setAuthState((prev) => ({ ...prev, user, loading: false }));
          return;
        }
        lastUidRef.current = user.uid;

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
  // the onIdTokenChanged round-trip, which still fires afterward as a
  // safety net.
  async function logoutUser() {
    await firebaseLogoutUser();
    lastUidRef.current = null;
    clearSessionCookie();
    setAuthState({ user: null, profile: null, loading: false });
  }

  return (
    <AuthContext.Provider value={{ ...authState, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
