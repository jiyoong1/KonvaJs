import { useState } from "react";
import { useAuth } from "./auth/authContext";

export default function Panel() {
  const { logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  if (!user) return null;

  return (
    <div className="flex mt-[40px]">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:opacity-100  opacity-40 absolute top-[30px] left-[40px] z-20 px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
      >
        {isOpen ? "Hide Panel" : "Show Panel"}
      </button>

      {/* Panel */}
      <div
        className={`bg-white rounded-lg shadow-lg overflow-hidden
          transition-all duration-300 ease-in-out mt-[40px]
          ${isOpen ? "w-60 p-4 mr-[20px]" : "w-0 p-0"}`}
      >
        {/* Content only if open */}
        <div className={`${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}>
          <h2 className="text-2xl font-bold mb-4 text-center">Panel</h2>
          <div className="space-y-2 flex flex-col">
            <a href="/" className="p-2 bg-purple-100 rounded hover:bg-purple-200 transition cursor-pointer text-center font-medium">
              Dashboard
            </a>
            <a href="/draw/" className="p-2 bg-purple-100 rounded hover:bg-purple-200 transition cursor-pointer text-center font-medium">
              Draw
            </a>
            <div onClick={() => logout()} className="p-2 bg-purple-100 rounded hover:bg-purple-200 transition cursor-pointer text-center font-medium">
              Logout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
