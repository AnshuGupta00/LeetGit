import { Code2, Menu, X } from "lucide-react";
import { useState } from "react";
import DownloadButton from "./components/DownloadButton";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Integrations", href: "#integrations" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav className="navbar">
      <a href="#home" className="brand" aria-label="Gitleet home">
        <Code2 size={32} strokeWidth={2.5} />
        <span>Gitleet</span>
      </a>

      <div className="desktop-links">
        {links.map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>

      <div className="nav-actions">
        <a href="#signin" className="signin-button">
          Sign In
        </a>
        <DownloadButton className="nav-cta">
          Get Started Free
        </DownloadButton>
      </div>

      <button
        className="mobile-menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {menuOpen && (
        <div className="mobile-menu">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <a href="#signin" onClick={() => setMenuOpen(false)}>
            Sign In
          </a>

          <DownloadButton
            href="#get-started"
            className="nav-cta"
            onClick={() => setMenuOpen(false)}
          >
            Get Started Free
          </DownloadButton>
        </div>
      )}
    </nav>
  );
}