import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

/**
 * Mounts a page component into <div id="root">.
 *
 * In this MPA every HTML page has its own small entry file that calls this
 * once. Each page is an independent React app, so there is no client-side router.
 * StrictMode runs extra checks in development (e.g. effects run twice to
 * surface missing cleanups); it has no effect in production builds.
 */
export function mountPage(Page: ComponentType) {
  const root = document.getElementById("root");
  if (!root) throw new Error('Missing <div id="root"> in the HTML page');

  createRoot(root).render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
}
