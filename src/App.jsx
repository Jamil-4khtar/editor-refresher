import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);

  // minimal document model for lesson 4
  const [doc, setDoc] = useState({
    root: {
      id: "root",
      children: [
        { id: "title-1", type: "text", text: "Welcome to the Editor" },
        { id: "para-1", type: "text", text: "Double-click me to edit live!" },
      ],
    },
  });

  const [selectedId, setSelectedId] = useState(null);
  const [rect, setRect] = useState(null);

  // ---- messaging: parent listens to iframe
  useEffect(() => {
    function onMessage(e) {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "ready") {
        // hydrate when iframe says it's ready
        postToIframe({ type: "hydrate", doc });
      }

      if (msg.type === "clicked") {
        setSelectedId(msg.id);
        requestRect(msg.id);
      }

      if (msg.type === "rect") {
        if (msg.id === selectedId) setRect(msg.rect);
      }

      if (msg.type === "layoutChanged") {
        if (selectedId) requestRect(selectedId);
      }

      if (msg.type === "inlineEditCommit") {
        const { id, text } = msg;
        setDoc((prev) => {
          const next = { ...prev, root: { ...prev.root } };
          next.root.children = prev.root.children.map((ch) =>
            ch.id === id ? { ...ch, text } : ch
          );
          return next;
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectedId, doc]);

  // rehydrate on doc change (keeps preview in sync)
  useEffect(() => {
    postToIframe({ type: "hydrate", doc });
    if (selectedId) requestRect(selectedId);
  }, [doc]);

  function postToIframe(message) {
    const w = iframeRef.current?.contentWindow;
    if (w) w.postMessage(message, "*");
  }
  function requestRect(id) {
    postToIframe({ type: "getRect", id });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", height: "100vh" }}>
      {/* canvas: iframe + overlay */}
      <div style={{ position: "relative", borderRight: "1px solid #e5e7eb" }}>
        <iframe
          ref={iframeRef}
          title="preview"
          sandbox="allow-scripts allow-same-origin"
          style={{ width: "100%", height: "100%", border: "none" }}
          // srcDoc={previewHTML}
          src="previewHTML.html"
          onLoad={() => postToIframe({ type: "hydrate", doc })}  // safety hydrate
        />
        {rect && (
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              outline: "2px solid #2563eb",
              borderRadius: 4,
              boxShadow: "0 0 0 4px rgba(37,99,235,0.15)"
            }}
          />
        )}
      </div>

      {/* sidebar */}
      <div style={{ padding: 16, background: "#f8fafc" }}>
        <h3 style={{ margin: 0 }}>Inspector</h3>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          Click or double-click in the preview
        </div>
        <div
          style={{
            padding: 12,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            marginBottom: 12
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>Selected ID</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{selectedId || "—"}</div>
        </div>
        <div
          style={{
            padding: 12,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>Rect</div>
          <pre style={{ margin: 0, fontSize: 12 }}>
            {rect ? JSON.stringify(rect, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </div>  
  );
}
