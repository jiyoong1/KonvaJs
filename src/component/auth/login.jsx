import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export default function LoginPage() {
  const demoUsers = JSON.parse(import.meta.env.VITE_DEMO_USERS || "[]");

  const [email, setEmail] = useState(demoUsers[0]?.email || "");
  const [password, setPassword] = useState(demoUsers[0]?.password || "");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Check if a demo user matches the email and password
    const matchedUser = demoUsers.find((user) => user.email === email && user.password === password);
    if (matchedUser) {
      login(matchedUser); // update global auth state
      navigate(from, { replace: true }); // redirect to original page
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <>
      <div></div>
      <div className="min-h-screen flex items-center justify-center px-4 w-full">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-2xl">
          <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-800">Login</h2>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-5 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-5 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-purple-500 text-white rounded-xl shadow-lg hover:bg-purple-600 transition-all font-semibold text-lg"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
