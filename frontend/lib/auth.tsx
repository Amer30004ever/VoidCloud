import {
  AuthProvider as BaseAuthProvider,
  useAuth as useBaseAuth,
  type User,
} from "@/contexts/AuthContext";

export interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: User;
  requires2FA?: boolean;
  userId?: string;
}

export const AuthProvider = BaseAuthProvider;
export const useAuth = useBaseAuth;
export type { User };
