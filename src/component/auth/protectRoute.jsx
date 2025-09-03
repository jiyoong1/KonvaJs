// src/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // save the attempted URL in state
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
