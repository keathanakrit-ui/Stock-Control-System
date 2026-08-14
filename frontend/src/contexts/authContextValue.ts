import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole, Profile } from "../models/profile";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  active: boolean;
  isLoading: boolean;
  accessError: string | null;
  signIn: (employeeCode: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
