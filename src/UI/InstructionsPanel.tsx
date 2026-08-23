import { VIEWER_CONTROL_GROUPS } from "./uiDefinitions";

export default function InstructionsPanel() {
  return (
    <section className="preview-instructions-panel" id="instructions">
      <div className="instructions-heading">
        <h2>Instructions</h2>
        <p>Use gestures or the keyboard and mouse alternatives below.</p>
      </div>
      <div className="instruction-grid">
        {VIEWER_CONTROL_GROUPS.map((group) => (
          <article className="instruction-card" key={group.title}>
            <span className="instruction-icon">{group.icon}</span>
            <span>
              <strong>{group.title}</strong>
              <small>{group.text}</small>
              <span className="instruction-fallbacks">
                {group.keyboard && <em>Keyboard: {group.keyboard}</em>}
                {group.mouse && <em>Mouse: {group.mouse}</em>}
              </span>
            </span>
          </article>
        ))}
      </div>
      <div className="instruction-quick-tips" aria-label="Quick tips">
        <strong>Quick tips</strong>
        <span><kbd>F</kbd> opens Immersive view; <kbd>Esc</kbd> returns.</span>
        <span>Gallery lets you switch built-in or uploaded models.</span>
        <span>Click or pinch the viewer to cycle selectable areas.</span>
      </div>
      <p className="instruction-footnote">
        Debug mode shows the live public gesture JSON for inspection.
      </p>
    </section>
  );
}
