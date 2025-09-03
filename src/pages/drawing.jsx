// Test.jsx
import React, { useState } from "react";
import KonvaCanvas from "../component/konvaJs";
import { debounce } from "../assets/script/public";
import { useParams } from "react-router-dom";

export default function DrawingPage() {
  const containerRef = React.useRef(null);
  const [height, setHeight] = React.useState(window.innerHeight - 200);
  const isResizing = React.useRef(false);
  const [editId, setEditId] = useState(null);
  const { id } = useParams();

  React.useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight - 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = `${height}px`;
    }
  }, [height]);

  const startResize = (e) => {
    e.preventDefault();
    isResizing.current = true;
    if (!containerRef.current) return;
    const startY = e.clientY;
    const startHeight = containerRef.current.offsetHeight;

    const onMouseMove = (moveEvent) => {
      if (!isResizing.current) return;
      const newHeight = startHeight + (moveEvent.clientY - startY);
      if (newHeight > 500) {
        // min height safeguard
        setHeight(newHeight);
        containerRef.current.style.minHeight = `${newHeight}px`;
      }
    };

    const onMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener("mousemove", debounce(onMouseMove, 1000));
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="mt-[80px] flex items-start justify-center shadow-2xl rounded-2xl bg-white relative"
      style={{ minHeight: height }}
    >
      <KonvaCanvas height={height - 200} edit={id ? true : false} drawId={id} />
      <div onMouseDown={startResize} className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize bg-gray-300 rounded-b-2xl" />
    </div>
  );
}
