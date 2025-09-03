import {  Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./component/auth/authContext";
import LoginPage from "./component/auth/login";
import ProtectedRoute from "./component/auth/protectRoute";

import Panel from "./component/panel";
import DrawingPage from "./pages/drawing";
import Dashboard from "./pages/dashboard";
import Icons from "./assets/tools/icon";

export default function App() {
  return (
    <AuthProvider>
      <Icons />
      <div className="p-[40px] pt-0 bg-gradient-to-r grid from-blue-200 via-purple-300 to-pink-200">
        <div className="min-h-screen grid grid-cols-[auto_1fr] justify-start items-start">
          <Panel />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/draw"
              element={
                <ProtectedRoute>
                  <DrawingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/draw/:id"
              element={
                <ProtectedRoute>
                  <DrawingPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
