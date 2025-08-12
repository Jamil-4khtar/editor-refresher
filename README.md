awesome — let’s build the **visual editor** from scratch, step‑by‑step. I’ll keep it practical, incremental, and each step will end with “done when” checks so you know exactly what to verify before moving on.

---

# Phase 0 — Ground rules & setup

**Editor goals (recap):**

* Render the *real* page exactly as it looks (accurate layout).
* Edit content (text/images/blocks), CSS (safe but flexible), and rearrange/resize any element/container.
* React-only, no TypeScript unless you ask.

**Core idea:**
Use an **iframe preview** for pixel‑perfect rendering, and a **React overlay** in the parent to handle selection, drag/resize, and sidebars. Communicate via `postMessage`.

**Minimal folders**

```
/editor
  /src
    /preview               # code that runs inside the iframe
    /app                   # parent editor app (sidebars, overlay, state)
    /shared                # shared utils (IDs, schema, serializers)
```

---

# Phase 1 — Preview iframe & message bridge

**What you build**

1. A parent React app with a main layout: left sidebar (empty for now), center canvas (iframe), right sidebar (empty).
2. A static Preview page served at `/preview` (or separate dev server) that:

   * Listens to `message` events (from parent).
   * Can “hydrate” itself from a `PageDocument` JSON (initially a simple static DOM like a hero + text).
3. A **message protocol** (simple JSON) with types:

   * `hydrate(document)`, `patch(delta)`, `getRect(id)`, `hitTest(point)`, `select(id)`, `ping/pong`.

**Key implementation notes**

* Add `data-editor-id` to every *rendered element* that maps to a Block.
* Inside preview, a tiny “bridge” exposes:

  * `getRectForId(id)` → `{x,y,width,height, transform, zIndex}`.
  * `hitTestAt(x,y)` → closest `data-editor-id` (topmost).

**Done when**

* Parent loads iframe.
* Parent sends `hydrate` → preview renders your simple tree with `data-editor-id`s.
* Parent can ask `getRect` for an id and gets correct box.
* Click in preview reports back the block id (either preview sends on click, or parent asks via `hitTest`).

---

# Phase 2 — Selection & overlay

**What you build**

* A transparent **Overlay** component that sits above the iframe (positioned absolutely).
* When a block is selected, parent asks preview for the element’s DOMRect and draws:

  * a blue outline,
  * resize handles (8),
  * a small floating toolbar near the selection (Delete / Duplicate placeholders).

**UX details**

* Click in preview selects the block (id).
* Arrow keys: move selection to parent/child/sibling (we’ll wire later).
* ESC clears selection.

**Done when**

* Selecting any element highlights it accurately, even after window resize or scroll.
* Selection updates when the preview content changes size.

---

# Phase 3 — Content editing (text & image)

**What you build**

* **Text editing:**

  * Double-click on a text block → enter edit mode.
  * Option A (simple, robust): open a floating input/RT editor in parent; on change, send `patch` with `{props: {text: ...}}` to preview.
  * Option B (more WYSIWYG): enable `contentEditable` *inside* the iframe; bridge posts changes to parent.
* **Image editing:**

  * Right sidebar shows selected block fields; if `type: 'image'`, show URL input + “Choose from Media” button (stub for now).
  * On change, send `patch` to preview and update local doc.

**Data model (minimal)**

```js
Block = {
  id, type, props: { text?, src?, alt? },
  styles: { inline: {}, classNames: [] },
  children: []
}
```

**Done when**

* You can edit a text value and see it update live in preview *and* your in-memory document.
* You can replace an image URL and it updates instantly.

---

# Phase 4 — Drag, resize, reorder

**What you build**

* **Drag/Move**:

  * Start drag from overlay selection box; while dragging, compute new target position.
  * Two modes:

    * *Flow layout (default web flow)* → this is a **reorder** (drop before/after a sibling).
    * *Absolutely positioned blocks* → update `styles.inline.{left, top}`.
* **Resize**:

  * From handles, update `styles.inline.width/height` (absolute) or layout properties (e.g., `flex-basis`, `grid-template-columns`) depending on the parent container type.
* **Reorder in tree**:

  * Show insertion indicator for siblings.
  * On drop, update `children` array in your document.

**Practical tips**

* Start with *absolute positioning* for a subset of blocks to validate drag/resize end‑to‑end.
* Then support flow reorder for common containers. Use a drag “ghost” and placeholder.

**Done when**

* You can move/resize an image block and it updates live.
* You can drag a text block above/below another and the document order changes.

---

# Phase 5 — Style inspector (safe CSS editing)

**What you build**

* A right sidebar **Style Inspector** with sections:

  * Layout (display, position, flex/grid basics, width/height)
  * Spacing (margin/padding with linked controls)
  * Typography (font-size, line-height, weight)
  * Background, border, radius, shadow
* Changes write into `styles.inline` (JSON), and the preview bridge applies them to the element.
* Add **Breakpoint selector** (Desktop / Tablet / Mobile) to scope styles per breakpoint (store per‑breakpoint maps like `styles.inlineByBp['md']`).

**Safety**

* Allow only an **allowlist** of CSS props.
* Keep an “Advanced (raw CSS)” textarea behind a toggle; validate/sanitize before storing; apply only inside preview.

**Done when**

* You can tweak spacing/typography and see exact changes reflected.
* Switching breakpoints stores & applies breakpoint‑scoped styles.

---

# Phase 6 — Blocks palette & schema-driven fields

**What you build**

* A **Blocks Palette** (left sidebar) listing reusable components (Hero, Section, Text, Image, Button, Grid).
* Each block type has a **schema**:

  * editable fields (with types),
  * default styles,
  * allowed children.
* Clicking a block inserts it as a child of the current selection (or root if none).
* The right sidebar fields are generated from schema → fewer hardcoded forms.

**Done when**

* You can insert a Hero block with default content, then edit its fields via the auto‑generated inspector.

---

# Phase 7 — Undo/Redo, autosave, versioning hooks

**What you build**

* A centralized `performCommand()` that changes state via small ops (insert, remove, move, patchProps, patchStyles).
* Maintain **undo/redo stacks** of ops; keyboard shortcuts: `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`.
* **Autosave** timer (e.g., every 5–10s when dirty) — call your draft API (or stub) with a **JSON Patch** delta.
* Show Save status: “Saved · 12:41 PM”, “Saving…”.

**Done when**

* Any edit is undoable/redoable.
* Draft saves periodically without blocking UX.

---

# Phase 8 — Multi-select, snapping, alignment guides

**What you build**

* Shift+click to select multiple blocks.
* Drag group selection (marquee) in overlay.
* Add **snap lines**: compute candidate edges from nearby elements (ask preview for rects of visible siblings), snap movement/resizing to those lines.

**Done when**

* You can move multiple cards together; snapping shows helpful guides.

---

# Phase 9 — Media picker (cloud), lock/collab basics

**What you build**

* Stub/real Media modal for picking/uploading images (wire later to Cloudinary/S3).
* **Soft locks**: on focus‐edit of a block, call a lock API; show “Edited by X” indicators; auto‑expire after inactivity.

**Done when**

* Image change flows through media modal.
* Second browser window shows locks/presence correctly.

---

# Phase 10 — Hardening & polish

**Checklist**

* Strict origin checks on `postMessage`.
* Iframe `sandbox` and CSP.
* Sanitize rich text & any raw CSS.
* Virtualize overlay calculations for long pages.
* Perf pass: debounce measurement, dynamic import heavy widgets (rich text, dnd).

---

## Minimal contracts (copy/paste ready)

**Message types (parent → preview)**

```js
{ type: 'hydrate', document }
{ type: 'patch', ops: [ /* JSON-Patch or your custom ops */ ] }
{ type: 'getRect', id }
{ type: 'hitTest', point: { x, y } }
{ type: 'select', id }
{ type: 'setBreakpoint', bp: 'base'|'md'|'lg' }
```

**Message types (preview → parent)**

```js
{ type: 'ready' }
{ type: 'rect', id, rect }
{ type: 'clicked', id }
{ type: 'layoutChanged', ids: [...] }  // e.g., reflow after patch
```

**Command ops (for undo/redo)**

```js
{ op: 'patchProps', id, propsDelta }
{ op: 'patchStyles', id, stylesDelta, bp? }
{ op: 'insert', parentId, index, block }
{ op: 'remove', id }
{ op: 'move', id, newParentId, newIndex }
```

---

## Common pitfalls & fixes

* **Overlay misalignment**: always recalc rects on scroll/resize and after DOM mutations; consider `ResizeObserver` inside iframe to emit `layoutChanged`.
* **Pointer events**: set `pointer-events:none` on overlay except for handles; handles get `pointer-events:auto`.
* **Z-index hell**: place overlay at highest z; internally manage handle z‑order.
* **Flow vs absolute**: start with absolute to validate pipeline; then add flow reorder gradually.
* **Rich text sanitization**: never store raw HTML without sanitizing; prefer structured rich text (e.g., Slate JSON) then render.

---

## What I can deliver next (pick one):

1. **A ready-to-use file/folder scaffold** with React components & the postMessage bridge skeleton.
2. **Overlay selection + getRect demo** (click to select, outline drawn).
3. **Text editing pipeline** (double-click → edit → patch → live preview).
4. **Drag/resize MVP** with absolute positioning.

Tell me which starting point you want, and I’ll walk you through wiring it up (no noisy line‑by‑line code, just the right pieces and why).

---

---

---

Got it — let’s rebuild this in **bite-sized lessons**, each one adding a key feature so you can follow along and run the code after every step.

---

## **Lesson 1 — The Minimal Editor Frame**

**Goal:**
Get a React app showing:

1. An **iframe preview** area (just static HTML for now)
2. Space for a future **overlay** and **sidebars**

**Key Points:**

* We use an iframe so the preview looks exactly like the final site.
* The parent React app will later send messages to this iframe.

**Code:**

```jsx
import React, { useRef } from "react";

export default function App() {
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
          ref={iframeRef}
          title="preview"
          style={{ width: "100%", height: "100%" }}
          srcDoc={previewHTML}
        />
      </div>

      {/* Sidebar placeholder */}
      <div style={{ width: 250, background: "#f8f8f8", padding: 10 }}>
        <h3>Inspector</h3>
        <p>Selected element: None</p>
      </div>
    </div>
  );
}
```

**Try it:**

* Put this in a new React project.
* You’ll see the iframe on the left and a sidebar on the right.
* This is our “canvas” and “control panel.”

---

### ✅ Done when:

* You can run the app and see the iframe with “Hello Editor!” text.
* Sidebar is visible but not functional yet.

---

Do you want me to move on to **Lesson 2 — Selecting Elements inside the iframe** where we’ll make elements clickable so the sidebar knows what’s selected? This is the next building block before text/CSS editing.

---

---

---

awesome.

## Lesson 2 — Click-to-select inside the iframe (postMessage)

**Goal:**
When you click an element in the preview, the parent app (React) learns which element was clicked and shows it in the sidebar.

**Concepts:**

* Add `data-editor-id` to preview elements.
* In the iframe, listen for `click`, then `postMessage({ type: 'clicked', id })` to the parent.
* In the parent, listen for `message` and update selected state.

---

### Parent (React) — minimal selection state + message handler

```jsx
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
```

---

### What you should see

* Hover highlights (CSS only) on clickable elements.
* Click a heading, paragraph, card, or image placeholder → the **Selected ID** in the sidebar updates.

---

### Done when

* Clicking any element updates the sidebar with the correct `data-editor-id`.
* No errors in console.

---

### Next lesson?

If this works, we’ll do **Lesson 3 — Draw a selection outline on top of the iframe** (start the overlay layer and ask the iframe for element bounds).

---

---

---

great—Lesson 3 coming up 👇

# Lesson 3 — Selection Outline (Overlay) + Element Bounds

**Goal:**
When you click an element inside the iframe, the parent draws a blue selection box **on top of the iframe**, exactly around that element.

**Concepts you’ll wire now**

* `postMessage` request: parent → iframe: `{ type: 'getRect', id }`
* iframe computes `getBoundingClientRect()` and replies with `{ type: 'rect', id, rect }`
* Parent renders an absolutely-positioned overlay box using that rect
* Recalculate on layout changes (resize/content edits)

---

## Drop-in code (replace your App with this)

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [rect, setRect] = useState(null);

  // Listen to messages from iframe
  useEffect(() => {
    function onMessage(e) {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "ready") {
        // could send initial hydrate later—no-op for now
      }

      if (msg.type === "clicked") {
        setSelectedId(msg.id);
        requestRect(msg.id);
      }

      if (msg.type === "rect") {
        if (msg.id === selectedId) setRect(msg.rect);
      }

      if (msg.type === "layoutChanged") {
        // when preview reflows (resize, font load, etc.)
        if (selectedId) requestRect(selectedId);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectedId]);

  // Helper: ask iframe for element bounds
  function requestRect(id) {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: "getRect", id }, "*");
  }

  // Simple preview HTML (with IDs and a layout-change observer)
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: system-ui, sans-serif; padding: 24px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
          .image { width: 100%; aspect-ratio: 16/9; background: #eee; border-radius: 8px; }
          .clickable:hover { outline: 2px solid #3b82f6; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1 data-editor-id="title-1" class="clickable">Welcome to the Editor</h1>

        <div class="grid">
          <div class="card clickable" data-editor-id="card-a">
            <h2 class="clickable" data-editor-id="card-a-title">Card A</h2>
            <p class="clickable" data-editor-id="card-a-text">Click different elements to select them.</p>
            <div class="image clickable" data-editor-id="card-a-image"></div>
          </div>

          <div class="card clickable" data-editor-id="card-b">
            <h2 class="clickable" data-editor-id="card-b-title">Card B</h2>
            <p class="clickable" data-editor-id="card-b-text">We’ll draw a selection box around the exact bounds.</p>
            <div class="image clickable" data-editor-id="card-b-image"></div>
          </div>
        </div>

        <script>
          // Notify parent that preview is ready
          window.parent.postMessage({ type: 'ready' }, '*');

          // Click → send selected id to parent
          document.addEventListener('click', function (e) {
            const el = e.target.closest('[data-editor-id]');
            if (!el) return;
            const id = el.getAttribute('data-editor-id');
            window.parent.postMessage({ type: 'clicked', id }, '*');
          }, true);

          // Handle requests from parent
          window.addEventListener('message', function(e){
            const msg = e.data;
            if(!msg || typeof msg !== 'object') return;

            if (msg.type === 'getRect') {
              const rect = getRectForId(msg.id);
              window.parent.postMessage({ type:'rect', id: msg.id, rect }, '*');
            }
          });

          // Compute element bounds relative to iframe content (0,0 at top-left of iframe document)
          function getRectForId(id) {
            const el = document.querySelector('[data-editor-id="'+CSS.escape(id)+'"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
          }

          // Observe layout changes and notify parent so it can re-request rects
          const ro = new ResizeObserver(() => {
            window.parent.postMessage({ type: 'layoutChanged' }, '*');
          });
          ro.observe(document.documentElement);
          ro.observe(document.body);
        </script>
      </body>
    </html>
  `;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: "100vh" }}>
      {/* Canvas area with iframe + overlay */}
      <div style={{ position: "relative", borderRight: "1px solid #e5e7eb" }}>
        <iframe
          ref={iframeRef}
          title="preview"
          style={{ width: "100%", height: "100%", display: "block" }}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={previewHTML}
        />

        {/* Overlay sits on top of the iframe. 
            We position the selection box using rect from the iframe. */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          {rect && (
            <div
              style={{
                position: "absolute",
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                outline: "2px solid #2563eb",
                borderRadius: 6,
                boxShadow: "0 0 0 4px rgba(37,99,235,0.15)",
              }}
            />
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ padding: 16, background: "#f8fafc" }}>
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
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>Selected ID</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>
            {selectedId || "—"}
          </div>
        </div>

        <div
          style={{
            padding: 12,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>Rect</div>
          <pre style={{ margin: 0, fontSize: 12 }}>
{JSON.stringify(rect, null, 2) || "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

---

## What to check

* Click any element → the blue selection outline should hug it precisely.
* Resize the window → the outline should update automatically.
* Scroll inside the iframe (if content overflows) → still accurate.

  * (If you later make the iframe scroll, the approach still works—bounds are in iframe coordinates, and the overlay sits over the iframe.)

---

## Common “gotchas”

* If your overlay doesn’t align: make sure the overlay `div` is `position:absolute; inset:0;` inside the **same container** as the iframe.
* If you later add internal scrolling inside the iframe, the rects remain valid because they’re in iframe coordinates; the overlay is layered over the iframe viewport.

---

Ready for **Lesson 4 — Double-click to edit text (live)** where we’ll enable `contentEditable` inside the iframe and sync changes back to the parent?

---

---

---

# Perfect — let’s wire up **Lesson 4 — Double-click to edit text live**.

---

## **Goal**

When you double-click a text element in the preview, it becomes editable (`contentEditable`) inside the iframe.
When you press Enter or blur, it sends the updated text back to the parent, which updates state.

---

## **Key Flow**

1. In iframe:

   * Listen for `dblclick` on elements with `data-editor-id`.
   * If it’s a text-type element, set `contentEditable=true` and focus it.
   * On blur or Enter, send `{ type: 'inlineEditCommit', id, text }` to parent.
2. In parent:

   * On receiving `inlineEditCommit`, update our document data for that element.
   * Re-hydrate the iframe preview (so state is in sync).
   * Request a new rect for selection (in case the size changed).

---

## Updated `App` Code

This extends Lesson 3’s version.
The only changes:

* Parent: handle `inlineEditCommit`.
* Iframe HTML: add dblclick → edit logic.

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);
  const [doc, setDoc] = useState({
    root: {
      id: "root",
      children: [
        { id: "title-1", type: "text", text: "Welcome to the Editor" },
        { id: "para-1", type: "text", text: "Double-click me to edit live!" }
      ]
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    function onMessage(e) {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

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
        setDoc(prev => {
          const next = { ...prev, root: { ...prev.root } };
          next.root.children = prev.root.children.map(ch =>
            ch.id === id ? { ...ch, text } : ch
          );
          return next;
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectedId]);

  useEffect(() => {
    // rehydrate on doc change
    postToIframe({ type: "hydrate", doc });
    if (selectedId) requestRect(selectedId);
  }, [doc]);

  function postToIframe(msg) {
    const w = iframeRef.current?.contentWindow;
    if (w) w.postMessage(msg, "*");
  }

  function requestRect(id) {
    postToIframe({ type: "getRect", id });
  }

  // Build preview HTML from our doc
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .clickable:hover { outline: 2px solid #3b82f6; cursor: pointer; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          let state = { doc: null };

          function render() {
            const rootEl = document.getElementById('root');
            rootEl.innerHTML = '';
            if (!state.doc) return;
            state.doc.root.children.forEach(block => {
              const el = document.createElement('div');
              el.setAttribute('data-editor-id', block.id);
              el.className = 'clickable';
              el.textContent = block.text || '';
              el.addEventListener('dblclick', () => startInlineEdit(block.id, el));
              rootEl.appendChild(el);
            });
          }

          function startInlineEdit(id, el) {
            el.setAttribute('contenteditable', 'true');
            el.focus();
            const onBlur = () => {
              window.parent.postMessage({
                type: 'inlineEditCommit',
                id,
                text: el.textContent
              }, '*');
              cleanup();
            };
            const onKey = e => {
              if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            };
            function cleanup(){
              el.removeAttribute('contenteditable');
              el.removeEventListener('blur', onBlur);
              el.removeEventListener('keydown', onKey);
            }
            el.addEventListener('blur', onBlur);
            el.addEventListener('keydown', onKey);
          }

          function getRectForId(id) {
            const el = document.querySelector('[data-editor-id="'+CSS.escape(id)+'"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
          }

          window.addEventListener('message', e => {
            const msg = e.data;
            if (msg.type === 'hydrate') { state.doc = msg.doc; render(); }
            if (msg.type === 'getRect') {
              const rect = getRectForId(msg.id);
              window.parent.postMessage({ type: 'rect', id: msg.id, rect }, '*');
            }
          });

          document.addEventListener('click', e => {
            const el = e.target.closest('[data-editor-id]');
            if (!el) return;
            window.parent.postMessage({ type: 'clicked', id: el.getAttribute('data-editor-id') }, '*');
          }, true);

          const ro = new ResizeObserver(() => {
            window.parent.postMessage({ type: 'layoutChanged' }, '*');
          });
          ro.observe(document.body);
        </script>
      </body>
    </html>
  `;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 250px", height: "100vh" }}>
      <div style={{ position: "relative" }}>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: "100%", height: "100%", border: "none" }}
          srcDoc={previewHTML}
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
              borderRadius: 4
            }}
          />
        )}
      </div>
      <div style={{ padding: 16, background: "#f1f5f9" }}>
        <h3>Inspector</h3>
        <p>Selected: {selectedId || "—"}</p>
      </div>
    </div>
  );
}
```

---

### **What’s new**

* **Double-click any text** → turns blue outline into editable mode inside the iframe.
* **Blur or Enter** → commits changes to parent.
* Parent updates its doc state and re-hydrates preview, keeping things in sync.

---

### Next step

If you’re happy with text editing, Lesson 5 will add **CSS style editing from the sidebar** so you can tweak colors, font size, etc., and see it update live.

Do you want me to move to that next?

## Fixing Errors in Lesson 4
here you go — Lesson 4 code with the **ready ping + hydrate on ready + hydrate onLoad** wired in. Paste this as your `App.jsx` (or equivalent) and run.

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const iframeRef = useRef(null);

  // minimal document model for lesson 4
  const [doc, setDoc] = useState({
    root: {
      id: "root",
      children: [
        { id: "title-1", type: "text", text: "Welcome to the Editor" },
        { id: "para-1", type: "text", text: "Double-click me to edit live!" }
      ]
    }
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
        setDoc(prev => {
          const next = { ...prev, root: { ...prev.root } };
          next.root.children = prev.root.children.map(ch =>
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

  // ---- preview HTML (iframe content)
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          *{ box-sizing: border-box; }
          body { margin: 0; font-family: system-ui, sans-serif; padding: 20px; }
          .clickable:hover { outline: 2px solid #3b82f6; cursor: pointer; }
          #root > div { padding: 6px 0; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          let state = { doc: null };

          function render() {
            const rootEl = document.getElementById('root');
            rootEl.innerHTML = '';
            if (!state.doc) return;
            state.doc.root.children.forEach(block => {
              const el = document.createElement('div');
              el.setAttribute('data-editor-id', block.id);
              el.className = 'clickable';
              el.textContent = block.text || '';
              el.addEventListener('dblclick', () => startInlineEdit(block.id, el));
              rootEl.appendChild(el);
            });
          }

          function startInlineEdit(id, el) {
            el.setAttribute('contenteditable', 'true');
            el.focus();
            const onBlur = () => {
              window.parent.postMessage({
                type: 'inlineEditCommit',
                id,
                text: el.textContent
              }, '*');
              cleanup();
            };
            const onKey = e => {
              if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            };
            function cleanup() {
              el.removeAttribute('contenteditable');
              el.removeEventListener('blur', onBlur);
              el.removeEventListener('keydown', onKey);
            }
            el.addEventListener('blur', onBlur);
            el.addEventListener('keydown', onKey);
          }

          function getRectForId(id) {
            const el = document.querySelector('[data-editor-id=\"'+CSS.escape(id)+'\"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
          }

          // receive messages from parent
          window.addEventListener('message', e => {
            const msg = e.data;
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'hydrate') {
              state.doc = msg.doc;
              render();
              window.parent.postMessage({ type: 'layoutChanged' }, '*');
            }
            if (msg.type === 'getRect') {
              const rect = getRectForId(msg.id);
              window.parent.postMessage({ type:'rect', id: msg.id, rect }, '*');
            }
          });

          // click → notify parent
          document.addEventListener('click', e => {
            const el = e.target.closest('[data-editor-id]');
            if (!el) return;
            window.parent.postMessage({ type:'clicked', id: el.getAttribute('data-editor-id') }, '*');
          }, true);

          // notify on layout changes
          const ro = new ResizeObserver(() => {
            window.parent.postMessage({ type:'layoutChanged' }, '*');
          });
          ro.observe(document.body);

          // tell parent we're ready to be hydrated
          window.parent.postMessage({ type: 'ready' }, '*');
        </script>
      </body>
    </html>
  `;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", height: "100vh" }}>
      {/* canvas: iframe + overlay */}
      <div style={{ position: "relative", borderRight: "1px solid #e5e7eb" }}>
        <iframe
          ref={iframeRef}
          title="preview"
          sandbox="allow-scripts allow-same-origin"
          style={{ width: "100%", height: "100%", border: "none" }}
          srcDoc={previewHTML}
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
```

If the iframe still looks empty, open the browser console:

* you should see no CSP or sandbox errors,
* and you should see the “layoutChanged” messages triggering rect refresh after hydrate.

Ready for **Lesson 5 (CSS style editing from the sidebar)**?

---

---

---

# Lesson 5: **CSS style editing from the sidebar (live)**

### Goal

Change basic styles (font size, color, width/height, padding) for the selected element and see updates instantly in the iframe.

---

## Step A — Extend the document model (parent)

Add a `styles.inline` object per block.

```jsx
// in parent: initial doc
const [doc, setDoc] = useState({
  root: {
    id: "root",
    children: [
      { id: "title-1", type: "text", text: "Welcome to the Editor", styles:{ inline:{ fontSize:"28px", fontWeight:"700", margin:"8px 0" } } },
      { id: "para-1",  type: "text", text: "Double-click me to edit live!", styles:{ inline:{ color:"#374151" } } }
    ]
  }
});
```

Add a small helper to patch styles:

```jsx
function patchStyles(id, stylesDelta) {
  setDoc(prev => {
    const next = { ...prev, root: { ...prev.root } };
    next.root.children = prev.root.children.map(ch => {
      if (ch.id !== id) return ch;
      const inline = { ...(ch.styles?.inline || {}), ...stylesDelta };
      return { ...ch, styles: { ...(ch.styles || {}), inline } };
    });
    return next;
  });
}
```

---

## Step B — Apply styles inside the iframe (preview)

Teach the preview renderer to apply inline styles.

```html
<script>
// (inside iframe script)
// update render() → when creating each element:
function render() {
  const rootEl = document.getElementById('root');
  rootEl.innerHTML = '';
  if (!state.doc) return;
  state.doc.root.children.forEach(block => {
    const el = document.createElement('div');
    el.setAttribute('data-editor-id', block.id);
    el.className = 'clickable';
    el.textContent = block.text || '';

    // NEW: apply inline styles
    applyInlineStyles(el, block.styles?.inline);

    el.addEventListener('dblclick', () => startInlineEdit(block.id, el));
    rootEl.appendChild(el);
  });
}

function applyInlineStyles(el, inline) {
  if (!inline) return;
  for (const k in inline) {
    try { el.style[k] = inline[k]; } catch {}
  }
}
</script>
```

*(No other iframe changes needed — your existing hydrate flow already re-renders on change.)*

---

## Step C — Add a tiny Style Inspector (parent)

When something is selected, show inputs and update via `patchStyles`. Also re-request the rect so the blue box stays accurate.

```jsx
// in sidebar area (parent)
const selectedBlock = useMemo(() => {
  const id = selectedId;
  if (!id) return null;
  return doc.root.children.find(ch => ch.id === id) || null;
}, [doc, selectedId]);

function setStyle(id, key, value) {
  patchStyles(id, { [key]: value || undefined });
  requestRect(id); // keep overlay aligned after size changes
}

{/* Sidebar UI */}
<div style={{ padding: 16, background: "#f8fafc" }}>
  <h3>Inspector</h3>
  <p>Selected: {selectedId || "—"}</p>

  {selectedBlock && (
    <div style={{ background: "#fff", border:"1px solid #e5e7eb", borderRadius:8, padding:12 }}>
      <div style={{ fontWeight:600, marginBottom:8 }}>Styles</div>

      {/* Font size */}
      <label style={{ display:"block", fontSize:12, color:"#475569" }}>Font size (px)</label>
      <input
        type="number"
        value={parseInt(selectedBlock.styles?.inline?.fontSize || "")}
        onChange={e => setStyle(selectedBlock.id, "fontSize", e.target.value ? e.target.value + "px" : "")}
        style={{ width:"100%", margin:"6px 0 12px", padding:8, border:"1px solid #e2e8f0", borderRadius:6 }}
      />

      {/* Color */}
      <label style={{ display:"block", fontSize:12, color:"#475569" }}>Color</label>
      <input
        type="text"
        placeholder="#111827 or rgb(…)"
        value={selectedBlock.styles?.inline?.color || ""}
        onChange={e => setStyle(selectedBlock.id, "color", e.target.value)}
        style={{ width:"100%", margin:"6px 0 12px", padding:8, border:"1px solid #e2e8f0", borderRadius:6 }}
      />

      {/* Width / Height */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <label style={{ display:"block", fontSize:12, color:"#475569" }}>Width (px)</label>
          <input
            type="number"
            value={parseInt(selectedBlock.styles?.inline?.width || "")}
            onChange={e => setStyle(selectedBlock.id, "width", e.target.value ? e.target.value + "px" : "")}
            style={{ width:"100%", marginTop:6, padding:8, border:"1px solid #e2e8f0", borderRadius:6 }}
          />
        </div>
        <div>
          <label style={{ display:"block", fontSize:12, color:"#475569" }}>Height (px)</label>
          <input
            type="number"
            value={parseInt(selectedBlock.styles?.inline?.height || "")}
            onChange={e => setStyle(selectedBlock.id, "height", e.target.value ? e.target.value + "px" : "")}
            style={{ width:"100%", marginTop:6, padding:8, border:"1px solid #e2e8f0", borderRadius:6 }}
          />
        </div>
      </div>

      {/* Padding */}
      <label style={{ display:"block", fontSize:12, color:"#475569", marginTop:12 }}>Padding (CSS)</label>
      <input
        type="text"
        placeholder="e.g. 12px 16px"
        value={selectedBlock.styles?.inline?.padding || ""}
        onChange={e => setStyle(selectedBlock.id, "padding", e.target.value)}
        style={{ width:"100%", marginTop:6, padding:8, border:"1px solid #e2e8f0", borderRadius:6 }}
      />
    </div>
  )}
</div>
```

---

## Try it

* Click a text block, change **Font size**, **Color**, **Padding**.
* Watch the preview update instantly.
* Change **Width/Height** and see the selection outline stay accurate.

---

## Done when

* Style inputs modify the selected element live.
* Selection box keeps hugging the element after changes.
* No console errors.

Want Lesson 6 next: **Reorder blocks (drag to move above/below)** or **Image block + live resizing handles**?
