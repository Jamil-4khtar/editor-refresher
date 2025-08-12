import React, { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);

  // in parent: initial doc
  const [doc, setDoc] = useState({
    root: {
      id: "root",
      children: [
        {
          id: "title-1",
          type: "text",
          text: "Welcome to the Editor",
          styles: {
            inline: { fontSize: "28px", fontWeight: "700", margin: "8px 0" },
          },
        },
        {
          id: "para-1",
          type: "text",
          text: "Double-click me to edit live!",
          styles: { inline: { color: "#374151" } },
        },
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

  function patchStyles(id, stylesDelta) {
    setDoc((prev) => {
      const next = { ...prev, root: { ...prev.root } };
      next.root.children = prev.root.children.map((ch) => {
        if (ch.id !== id) return ch;
        const inline = { ...(ch.styles?.inline || {}), ...stylesDelta };
        return { ...ch, styles: { ...(ch.styles || {}), inline } };
      });
      return next;
    });
  }

  // in sidebar area (parent)
  const selectedBlock = useMemo(() => {
    const id = selectedId;
    if (!id) return null;
    return doc.root.children.find((ch) => ch.id === id) || null;
  }, [doc, selectedId]);

  function setStyle(id, key, value) {
    patchStyles(id, { [key]: value || undefined });
    requestRect(id); // keep overlay aligned after size changes
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 260px",
        height: "100vh",
      }}
    >
      {/* canvas: iframe + overlay */}
      <div style={{ position: "relative", borderRight: "1px solid #e5e7eb" }}>
        <iframe
          ref={iframeRef}
          title="preview"
          sandbox="allow-scripts allow-same-origin"
          style={{ width: "100%", height: "100%", border: "none" }}
          // srcDoc={previewHTML}
          src="previewHTML.html"
          onLoad={() => postToIframe({ type: "hydrate", doc })} // safety hydrate
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
              boxShadow: "0 0 0 4px rgba(37,99,235,0.15)",
            }}
          />
        )}
      </div>

      {/* Sidebar UI */}
      <div style={{ padding: 16, background: "#f8fafc" }}>
        <h3>Inspector</h3>
        <p>Selected: {selectedId || "—"}</p>

        {selectedBlock && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Styles</div>

            {/* Font size */}
            <label style={{ display: "block", fontSize: 12, color: "#475569" }}>
              Font size (px)
            </label>
            <input
              type="number"
              value={parseInt(selectedBlock.styles?.inline?.fontSize || "")}
              onChange={(e) =>
                setStyle(
                  selectedBlock.id,
                  "fontSize",
                  e.target.value ? e.target.value + "px" : ""
                )
              }
              style={{
                width: "100%",
                margin: "6px 0 12px",
                padding: 8,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            />

            {/* Color */}
            <label style={{ display: "block", fontSize: 12, color: "#475569" }}>
              Color
            </label>
            <input
              type="text"
              placeholder="#111827 or rgb(…)"
              value={selectedBlock.styles?.inline?.color || ""}
              onChange={(e) =>
                setStyle(selectedBlock.id, "color", e.target.value)
              }
              style={{
                width: "100%",
                margin: "6px 0 12px",
                padding: 8,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            />

            {/* Width / Height */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <label
                  style={{ display: "block", fontSize: 12, color: "#475569" }}
                >
                  Width (px)
                </label>
                <input
                  type="number"
                  value={parseInt(selectedBlock.styles?.inline?.width || "")}
                  onChange={(e) =>
                    setStyle(
                      selectedBlock.id,
                      "width",
                      e.target.value ? e.target.value + "px" : ""
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div>
                <label
                  style={{ display: "block", fontSize: 12, color: "#475569" }}
                >
                  Height (px)
                </label>
                <input
                  type="number"
                  value={parseInt(selectedBlock.styles?.inline?.height || "")}
                  onChange={(e) =>
                    setStyle(
                      selectedBlock.id,
                      "height",
                      e.target.value ? e.target.value + "px" : ""
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>

            {/* Padding */}
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#475569",
                marginTop: 12,
              }}
            >
              Padding (CSS)
            </label>
            <input
              type="text"
              placeholder="e.g. 12px 16px"
              value={selectedBlock.styles?.inline?.padding || ""}
              onChange={(e) =>
                setStyle(selectedBlock.id, "padding", e.target.value)
              }
              style={{
                width: "100%",
                marginTop: 6,
                padding: 8,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
