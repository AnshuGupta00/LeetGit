import { motion } from "framer-motion";
import {
  Zap,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Code2,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Stop Copy-Pasting",
    description:
      "Spend less time on repetitive tasks. Gitleet helps capture your accepted coding submissions automatically.",
    color: "purple",
  },
  {
    icon: GitBranch,
    title: "Keep Your Code Organized",
    description:
      "Keep your solutions organized in your configured GitHub repository with a consistent structure.",
    color: "blue",
  },
  {
    icon: Share2,
    title: "Showcase Your Progress",
    description:
      "Prepare professional LinkedIn posts to share your coding achievements and solution snippets.",
    color: "cyan",
  },
];

const steps = [
  {
    number: "01",
    title: "Solve",
    description:
      "Solve a problem on LeetCode. Gitleet detects the accepted submission through the extension.",
    icon: Code2,
  },
  {
    number: "02",
    title: "Sync",
    description:
      "Send your solution to your configured GitHub repository with an organized structure.",
    icon: GitBranch,
  },
  {
    number: "03",
    title: "Share",
    description:
      "Prepare a LinkedIn post to showcase your latest coding achievement.",
    icon: Share2,
  },
];

function SectionLabel({ children }) {
  return <span className="section-label">{children}</span>;
}

export function Features() {
  return (
    <section className="features-section" id="features">
      <div className="section-container">
        <motion.div
          className="section-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <SectionLabel>WHY GITLEET?</SectionLabel>
          <h2>The Problem Gitleet Solves</h2>
          <p>Focus on solving problems. Let Gitleet handle the repetitive work.</p>
        </motion.div>

        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                className="feature-card"
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.12 }}
                whileHover={{ y: -6 }}
              >
                <div className={`feature-icon ${feature.color}`}>
                  <Icon size={23} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <div className="feature-bottom">
                  <ArrowRight size={18} />
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="workflow-section" id="how-it-works">
      <div className="section-container">
        <motion.div
          className="section-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <SectionLabel>SIMPLE 3-STEP FLOW</SectionLabel>
          <h2>How It Works</h2>
          <p>From accepted submission to shareable achievement.</p>
        </motion.div>

        <div className="workflow-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                className="workflow-card"
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.15 }}
              >
                <div className="step-number">{step.number}</div>

                <div className="step-icon">
                  <Icon size={23} />
                </div>

                <h3>{step.title}</h3>
                <p>{step.description}</p>

                <div className="step-status">
                  <CheckCircle2 size={15} />
                  <span>
                    {index === 0
                      ? "Accepted submission"
                      : index === 1
                        ? "Repository workflow"
                        : "Sharing workflow"}
                  </span>
                </div>

                {index !== steps.length - 1 && (
                  <div className="workflow-arrow">
                    <ArrowRight size={20} />
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}