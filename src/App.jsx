import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);

  // 1) Listen for messages from iframe
  useEffect(() => {
    function onMessage(e) {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "clicked") {
        setSelectedId(msg.id);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 2) Static preview HTML with IDs (we'll wire clicks inside iframe)
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; }
          .card { border: 1px solid #ddd; border-radius: 10px; padding: 16px; margin: 10px 0; }
          .image { width: 320px; height: 180px; background:#eee; border-radius: 8px; }
          .clickable:hover { outline: 2px solid #3b82f6; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1 data-editor-id="title-1" class="clickable">Welcome to the Editor</h1>

        <div class="card clickable" data-editor-id="card-1">
          <h2 data-editor-id="card-1-title" class="clickable">Hero Card</h2>
          <p data-editor-id="card-1-text" class="clickable">
            Click different elements to select them.
          </p>
          <div data-editor-id="card-1-image" class="image clickable"></div>
        </div>

        <script>
          // Send {type:'clicked', id} to parent when any [data-editor-id] is clicked
          document.addEventListener('click', function (e) {
            const el = e.target.closest('[data-editor-id]');
            if (!el) return;
            const id = el.getAttribute('data-editor-id');
            window.parent.postMessage({ type: 'clicked', id }, '*');
          }, true);
        </script>
      </body>
    </html>
  `;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Preview */}
      <div style={{ flex: 1, borderRight: "1px solid #e5e5e5" }}>
        <iframe
          ref={iframeRef}
          title="preview"
          style={{ width: "100%", height: "100%" }}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={previewHTML}
        />
      </div>

      {/* Sidebar */}
      <div style={{ width: 280, padding: 16, background: "#f8fafc" }}>
        <h3 style={{ margin: 0 }}>Inspector</h3>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          Click anything in the preview
        </div>

        <div
          style={{
            padding: 12,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>Selected ID</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>
            {selectedId || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}