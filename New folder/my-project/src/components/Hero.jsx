import {
  ArrowRight,
  Check,
  Code2,
  GitBranch,
  Play,
  Zap,
} from "lucide-react";
import DownloadButton from "./DownloadButton.jsx";

const progress = [
  "Saving to GitHub...",
  "Preparing LinkedIn post...",
  "All set!",
];

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-glow" />

      <div className="hero-content">
        <div className="hero-copy">
          <div className="hero-badge">
            <span>LeetCode</span>
            <ArrowRight size={11} />
            <span>GitHub</span>
            <ArrowRight size={11} />
            <span>LinkedIn</span>
          </div>

          <h1>
            Your LeetCode Journey.
            <span>Automatically Documented.</span>
          </h1>

          <p className="hero-description">
            Solve coding problems while Gitleet helps you organize your
            solutions on GitHub and share your achievements on LinkedIn.
            Automatically.
          </p>

          <div className="hero-buttons">
            <DownloadButton className="primary-button">
              Get Started Free
            </DownloadButton>
            <a className="secondary-button" href="#how-it-works">
              <Play size={13} fill="currentColor" />
              See How It Works
            </a>
          </div>

          <div className="hero-trust">
            <span>
              <Check size={13} /> Chrome Extension
            </span>
            <span>
              <Check size={13} /> Secure &amp; Private
            </span>
            <span>
              <Check size={13} /> Free to Start
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Gitleet workflow preview">
          <div className="visual-glow" />

          <div className="code-window">
            <div className="window-header">
              <div className="window-brand">
                <Code2 size={16} />
                <span>Gitleet</span>
              </div>
              <div className="window-controls" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="submission-status">
              <span className="accepted-icon">
                <Check size={15} />
              </span>
              <span>Submission Detected!</span>
              <strong>Accepted</strong>
            </div>

            <div className="problem-details">
              <span>Problem</span>
              <strong>Two Sum</strong>
              <span>Language</span>
              <strong className="language-label">
                <span className="javascript-dot">J</span> Java
              </strong>
            </div>

            <div className="workflow-progress">
              {progress.map((item, index) => (
                <div className="workflow-progress-row" key={item}>
                  <span className="progress-marker">
                    {index < 2 ? <Check size={9} /> : <Zap size={9} />}
                  </span>
                  <span>{item}</span>
                  {index < 2 && <Check size={11} className="progress-check" />}
                </div>
              ))}
            </div>

            <div className="window-footer">
              <span className="footer-dot" />
              Your solution has been documented.
            </div>
          </div>

          <div className="integration-stack">
            <div className="status-card">
              <span className="status-icon github-icon">
                <GitBranch size={21} />
              </span>
              <span className="status-copy">
                <strong>GitHub</strong>
                <span>Solution saved to your repository</span>
              </span>
              <span className="status-check">
                <Check size={12} />
              </span>
            </div>

            <div className="status-card linkedin-status">
              <span className="status-icon linkedin-icon">in</span>
              <span className="status-copy">
                <strong>LinkedIn</strong>
                <span>Post ready to share</span>
              </span>
              <span className="status-check">
                <Check size={12} />
              </span>
              <div className="linkedin-post-preview">
                <strong>Solved Two Sum on LeetCode!</strong>
                <span>#LeetCode #Coding #Public</span>
                <div className="mini-code-preview">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
