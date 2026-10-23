import { Code2, GitBranch, Quote } from "lucide-react";
import DownloadButton from "./DownloadButton.jsx";

const integrations = [
  {
    name: "LeetCode",
    description: "Detects accepted submissions and extracts your solution.",
    icon: Code2,
    className: "leetcode",
  },
  {
    name: "GitHub",
    description: "Automatically pushes your code to your repository.",
    icon: GitBranch,
    className: "github",
  },
  {
    name: "LinkedIn",
    description: "Share your achievements with a professional post.",
    className: "linkedin",
  },
];

function ClosingSection() {
  return (
    <footer className="closing-section" id="integrations">
      <div className="closing-canvas">
        <div className="closing-top">
          <div className="closing-intro">
            <span className="closing-eyebrow">INTEGRATIONS</span>
            <h2>Works With Your Favorite Tools</h2>
            <p>Gitleet connects seamlessly with the tools you already use.</p>
          </div>

          <div className="integration-list">
            {integrations.map((integration) => {
              const Icon = integration.icon;

              return (
                <article
                  className="integration-item"
                  key={integration.name}
                >
                  <span className={`integration-logo ${integration.className}`}>
                    {Icon ? <Icon size={26} /> : <span>in</span>}
                  </span>
                  <h3>{integration.name}</h3>
                  <p>{integration.description}</p>
                </article>
              );
            })}
          </div>

          <blockquote className="testimonial-card">
            <Quote size={17} className="testimonial-quote" />
            <p>
              “Gitleet has made my coding journey so much easier. I no longer
              have to manually upload my solutions or post on LinkedIn. It just
              works!”
            </p>
            <div className="testimonial-author">
              <span className="testimonial-avatar" aria-hidden="true">
                PS
              </span>
              <span>
                <strong>Priya Sharma</strong>
                <small>MCA Student</small>
              </span>
            </div>
          </blockquote>
        </div>

        <div className="closing-banner" id="get-started">
          <div className="closing-banner-copy">
            <span className="closing-eyebrow">READY TO GET STARTED?</span>
            <h2>
              Focus on solving problems.
              <br />
              Let Gitleet handle the repetitive work.
            </h2>
          </div>

          <div className="closing-banner-action">
            <DownloadButton className="primary-button">
              Get Started Free
            </DownloadButton>
            <p>
              <span>Install the Chrome Extension</span>
              <span>Connect Your Accounts</span>
              <span>Start Coding</span>
            </p>
          </div>
          <div className="closing-banner-glow" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}

export default ClosingSection;
