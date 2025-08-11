import React, { useRef } from "react";

function App() {
  const iframeRef = useRef(null);

  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Hello Editor!</h1>
        <p>This is the preview area.</p>
      </body>
    </html>
  `;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Main preview area */}
      <div style={{ flex: 1, border: "1px solid #ccc" }}>
        <iframe
          srcDoc={previewHTML}
          title="preview"
          style={{ width: "100%", height: "100%" }}
          ref={iframeRef}
        />
      </div>

      {/* Sidebar placeholder */}
      <div>
        <h3>Inspector</h3>
        <p>Selected element: None</p>
      </div>
    </div>
  );
}

export default App;
