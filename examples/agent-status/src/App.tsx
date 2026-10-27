import { useMemo, useState } from "react";
import { EmojiToken } from "react-emoji-styles";
import { createAgentTheme, states, type AgentState } from "./theme";

export function App() {
  const [state, setState] = useState<AgentState>("working");
  const [brokenImage, setBrokenImage] = useState(false);
  const theme = useMemo(() => createAgentTheme(brokenImage), [brokenImage]);
  const current = states[state];

  return (
    <main>
      <header className="masthead">
        <a href="#main" className="brand">
          Agent Desk<span> / reference app</span>
        </a>
        <span className="local-badge">Local artwork · No API key</span>
      </header>
      <section className="intro" id="main">
        <p className="eyebrow">BUILT WITH EMOJI STYLES</p>
        <h1>
          A clear signal.
          <br />
          At every step.
        </h1>
        <p className="lede">
          One agent task, three meaningful states. The interface keeps its
          labels and intent when the artwork changes or an image fails.
        </p>
      </section>
      <div className="workspace">
        <section className={`task-card ${state}`} aria-labelledby="task-title">
          <div className="card-top">
            <span className="eyebrow">TASK 014</span>
            <span className="task-kind">Code review</span>
          </div>
          <h2 id="task-title">Review the checkout changes</h2>
          <p className="task-context">
            Check the implementation, run validation, and prepare a reviewable
            result.
          </p>
          <div
            className="current-state"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="artwork" key={`${state}-${brokenImage}`}>
              <EmojiToken
                token={`agent.${state}`}
                theme={theme}
                size={80}
                loading="eager"
              />
            </div>
            <p className="state-name">{current.title}</p>
            <h3>{current.detail}</h3>
            <p>{current.note}</p>
          </div>
          <div className="task-footer">
            <span>YOUR WORKSPACE</span>
            <code>agent.{state}</code>
          </div>
        </section>
        <aside className="controls" aria-labelledby="controls-title">
          <p className="eyebrow">TRY THE INTEGRATION</p>
          <h2 id="controls-title">Change the signal.</h2>
          <p>
            These controls simulate task state. They do not run an AI agent.
          </p>
          <div className="state-options" role="group" aria-label="Agent state">
            {(Object.keys(states) as AgentState[]).map((key, index) => (
              <button
                key={key}
                type="button"
                aria-pressed={state === key}
                onClick={() => setState(key)}
              >
                <span className="step">0{index + 1}</span>
                <span>{states[key].title}</span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <label className="failure-control">
            <input
              type="checkbox"
              checked={brokenImage}
              onChange={(event) => setBrokenImage(event.target.checked)}
            />
            <span>
              Simulate unavailable artwork
              <small>
                Use a missing local URL to exercise the image-error fallback.
              </small>
            </span>
          </label>
          <p className="fallback-note">
            Fallback: native Unicode. Its appearance varies by OS; the
            accessible label stays the same.
          </p>
          <div className="code-note">
            <span>THE APPLICATION KEEPS THE INTENT</span>
            <code>{`<EmojiToken\n  token="agent.${state}"\n  theme={agentTheme}\n/>`}</code>
          </div>
        </aside>
      </div>
      <footer>
        <span>Three original SVG assets. One versioned semantic theme.</span>
        <a href="https://github.com/Blancochuy/emoji-styles/tree/master/examples/agent-status">
          Source & integration guide ↗
        </a>
      </footer>
    </main>
  );
}
