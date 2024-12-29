"use client"
import { createContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Add this new function to verify the token and get user data
  const verifyToken = async (token: string) => {
    try {

      
      // Make a request to your backend to verify the token and get user data
      const res = await axios.get("http://localhost:8000/auth/me", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${token}`,
        },
      });
      
      return res.data;
    } catch (error) {
      console.error("Token verification failed", error);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      return null;
    }
  };

  // Add useEffect to check for token on initial load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        const userData = await verifyToken(token);
        if (userData) {
          setUser({
            id: userData.id,
            username: userData.username,
            email: userData.email,
          });
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await axios.post(
        "http://localhost:8000/auth/token",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      
      const loggedUser = {
        id: res.data.user.id,
        username: res.data.user.username,
        email: res.data.user.email,
      };

      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.access_token}`;
      localStorage.setItem("token", res.data.access_token);
      setUser(loggedUser);
      router.push("/chat");
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };
  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("password", password);
      const res = await axios.post(
        "http://localhost:8000/auth/register",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (res.status === 400) {
        throw new Error(res.data.message);
      }
      router.push("/login");
    } catch (error) {
      console.error("Registration failed", error);
    }
  };

  const logout = () => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
