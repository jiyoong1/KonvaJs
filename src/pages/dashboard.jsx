import { useEffect, useState } from "react";
import { useAuth } from "../component/auth/authContext";
import KonvaCanvas from "../component/konvaJs";
import { removeTemp } from "../assets/script/public";

export default function Dashboard() {
  const { user } = useAuth();
  const [project, setProject] = useState([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [drawId, setDrawId] = useState(null);
  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem("drawingProjects") || "[]");

    const userProjects = projects[user?.id] || [];
    if (userProjects.length !== 0 && user) {
      setProject(userProjects);
    }
  }, [user]);
  const handleDelete = () => {
    if (drawId === null) return;
    const projects = JSON.parse(localStorage.getItem("drawingProjects") || "[]");
    if (!projects[user?.id]) return;
    projects[user.id].splice(drawId, 1);
    localStorage.setItem("drawingProjects", JSON.stringify(projects));
    setProject(projects[user.id]);
    setDrawId(null);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Welcome, {user?.name || "User"}!</h1>
        <p className="text-gray-600 text-lg">
          You have <span className="font-semibold text-gray-900">{project.length}</span> project{project.length > 1 ? "s" : ""} saved.
        </p>
      </div>

      {/* Projects container */}
      <div className=" flex items-start flex-col justify-start shadow-2xl rounded-2xl bg-white w-full max-w-4xl">
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg mt-4">Your projects canvas will appear here</div>
        <div className="flex flex-col w-full gap-4 p-4 max-h-[600px] overflow-scroll overflow-x-hidden tinyScrollBar">
          {project &&
            project.length > 0 &&
            project.map((proj, index) => {
              return (
                <div key={index} className=" shadow-md hover:shadow-xl rounded-2xl grid grid-cols-[1fr_150px] border border-gray-200 p-3 w-full">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{proj.name || `Project ${index + 1}`}</h2>
                    <p className="text-gray-600">Created on: {new Date(proj.date).toLocaleDateString()}</p>
                    <p className="text-gray-600">Drawing elements: {proj.drawing.length}</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div
                      className="w-[35px] h-[35px] rounded-full shadow-md border border-solid border-gray-400 flex items-center justify-center cursor-pointer hover:scale-105 transition"
                      title="View"
                      onClick={() => {
                        setShowCanvas(true);
                        setDrawId(index);
                      }}
                    >
                      <svg width={25} height={25} className={""}>
                        <use href="#icon-view" fill="#" />
                      </svg>
                    </div>
                    <a href={`/draw/${index}/`}>
                      <div
                        className="w-[35px] h-[35px] rounded-full shadow-md border border-solid border-gray-400 flex items-center justify-center cursor-pointer hover:scale-105 transition"
                        title="Edit"
                      >
                        <svg width={20} height={20} className={""}>
                          <use href="#icon-edit" fill="#" />
                        </svg>
                      </div>
                    </a>
                    <div
                      className="w-[35px] h-[35px] rounded-full shadow-md border border-solid border-gray-400 flex items-center justify-center cursor-pointer hover:scale-105 transition"
                      title="Delete"
                      onClick={() => {
                        setShowConfirm(true);
                        setDrawId(index);
                      }}
                    >
                      <svg width={20} height={20} className={""}>
                        <use href="#icon-delete" fill="#" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      {showCanvas && (
        <div className="fixed  inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[800px] rounded-xl shadow-2xl p-4 relative">
            <button
              onClick={() => {
                removeTemp(user.id, drawId);
                setShowCanvas(false);
                setDrawId(null);
              }}
              className="absolute shadow-md top-2 right-2 w-[35px] h-[35px] hover:bg-gray-100 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-lg transition text-2xl font-bold z-10"
            >
              ×
            </button>

            <KonvaCanvas height={600} view={true} drawId={drawId} />
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[300px] text-center relative">
            <p className="text-lg font-medium text-gray-700 mb-4">Are you sure you want to delete this?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  handleDelete();
                  setShowConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
