/**
 * Default demo project content. Represents a small local-business marketing
 * site so AI edits ("darker green", "shorten the headline", "more premium")
 * have a realistic target to act on.
 */

const HTML = `<header class="site-header" data-vibe-section="header">
  <div class="site-header__inner">
    <a class="brand" href="#top">
      <span class="brand__mark">CP</span>
      <span class="brand__name">Cascade Plumbing</span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="#services">Services</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
    <a class="btn btn-primary site-header__cta" href="#contact">Get a quote</a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<section class="hero" id="top" data-vibe-section="hero">
  <div class="hero__inner">
    <p class="hero__eyebrow">Licensed &amp; insured since 2004</p>
    <h1 class="hero__title">Fast, reliable plumbing for your home</h1>
    <p class="hero__subtitle">Emergency repairs, installations, and inspections from a local team you can trust. Same-day appointments available.</p>
    <div class="hero__actions">
      <a class="btn btn-primary btn-lg" href="#contact">Book a service</a>
      <a class="btn btn-ghost btn-lg" href="#services">See services</a>
    </div>
  </div>
</section>

<section class="features" id="services" data-vibe-section="features">
  <div class="features__inner">
    <h2 class="section-title">What we do</h2>
    <p class="section-subtitle">Straightforward pricing, no surprise fees.</p>
    <div class="feature-grid">
      <article class="feature-card">
        <div class="feature-card__icon">💧</div>
        <h3>Leak repair</h3>
        <p>Fast diagnosis and fixes for leaks big and small, before they become bigger problems.</p>
      </article>
      <article class="feature-card">
        <div class="feature-card__icon">🚿</div>
        <h3>Fixture installs</h3>
        <p>Sinks, faucets, water heaters and more, installed cleanly and correctly the first time.</p>
      </article>
      <article class="feature-card">
        <div class="feature-card__icon">🛠️</div>
        <h3>Emergency callouts</h3>
        <p>Burst pipe at 2am? We answer the phone and show up when it matters most.</p>
      </article>
    </div>
  </div>
</section>

<section class="about" id="about" data-vibe-section="about">
  <div class="about__inner">
    <h2 class="section-title">Why homeowners choose us</h2>
    <ul class="about__list">
      <li>20+ years serving the local area</li>
      <li>Upfront, flat-rate pricing</li>
      <li>Background-checked technicians</li>
      <li>1-year warranty on all work</li>
    </ul>
  </div>
</section>

<section class="cta" id="contact" data-vibe-section="cta">
  <div class="cta__inner">
    <h2>Ready to fix it right?</h2>
    <p>Call us or request a callback and we'll get back to you within the hour.</p>
    <a class="btn btn-primary btn-lg" href="tel:+15551234567">Call (555) 123-4567</a>
  </div>
</section>

<footer class="site-footer" data-vibe-section="footer">
  <div class="site-footer__inner">
    <p>&copy; 2026 Cascade Plumbing. All rights reserved.</p>
    <p class="site-footer__meta">Built with Vibe Editor</p>
  </div>
</footer>`;

const CSS = `:root {
  --brand: #16a34a;
  --brand-dark: #15803d;
  --ink: #0f172a;
  --ink-soft: #475569;
  --paper: #ffffff;
  --paper-soft: #f8fafc;
  --line: #e2e8f0;
  --radius: 10px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--ink);
  background: var(--paper);
  line-height: 1.5;
}

a { color: inherit; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn-primary { background: var(--brand); color: white; }
.btn-primary:hover { background: var(--brand-dark); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-ghost:hover { background: var(--paper-soft); }
.btn-lg { padding: 13px 26px; font-size: 1rem; }

.site-header__inner, .hero__inner, .features__inner, .about__inner, .cta__inner, .site-footer__inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

.site-header {
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(6px);
  z-index: 10;
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 14px;
  padding-bottom: 14px;
}

.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand__mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--brand); color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
}
.brand__name { font-weight: 700; font-size: 1.05rem; }

.site-nav { display: flex; gap: 20px; margin-left: auto; }
.site-nav a { text-decoration: none; color: var(--ink-soft); font-weight: 500; font-size: 0.92rem; }
.site-nav a:hover { color: var(--ink); }

.nav-toggle { display: none; }

.hero {
  padding: 88px 24px 96px;
  text-align: center;
  background: linear-gradient(180deg, var(--paper-soft), var(--paper));
}
.hero__eyebrow {
  color: var(--brand-dark);
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin: 0 0 14px;
}
.hero__title {
  font-size: clamp(2.1rem, 4vw, 3.2rem);
  margin: 0 0 18px;
  letter-spacing: -0.02em;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
.hero__subtitle {
  color: var(--ink-soft);
  font-size: 1.08rem;
  max-width: 560px;
  margin: 0 auto 32px;
}
.hero__actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

.section-title { font-size: 1.8rem; margin: 0 0 8px; letter-spacing: -0.01em; }
.section-subtitle { color: var(--ink-soft); margin: 0 0 40px; }

.features { padding: 80px 24px; }
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.feature-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  background: var(--paper);
}
.feature-card__icon { font-size: 1.6rem; margin-bottom: 12px; }
.feature-card h3 { margin: 0 0 8px; font-size: 1.05rem; }
.feature-card p { margin: 0; color: var(--ink-soft); font-size: 0.92rem; }

.about { padding: 64px 24px; background: var(--paper-soft); }
.about__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 32px;
}
.about__list li {
  padding-left: 26px;
  position: relative;
  color: var(--ink-soft);
}
.about__list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--brand);
  font-weight: 700;
}

.cta { padding: 72px 24px; text-align: center; }
.cta h2 { font-size: 1.7rem; margin: 0 0 10px; }
.cta p { color: var(--ink-soft); margin: 0 0 24px; }

.site-footer { border-top: 1px solid var(--line); padding: 24px; }
.site-footer__inner {
  display: flex;
  justify-content: space-between;
  color: var(--ink-soft);
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .site-nav { display: none; }
  .nav-toggle {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
  }
  .nav-toggle span { width: 20px; height: 2px; background: var(--ink); display: block; }
  .site-header__cta { display: none; }
  .feature-grid { grid-template-columns: 1fr; }
  .about__list { grid-template-columns: 1fr; }
  .site-footer__inner { flex-direction: column; gap: 6px; text-align: center; }
}`;

const JS = `// Mobile nav toggle
var navToggle = document.getElementById("nav-toggle");
if (navToggle) {
  navToggle.addEventListener("click", function () {
    var nav = document.querySelector(".site-nav");
    var expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    if (nav) nav.style.display = expanded ? "" : "flex";
  });
}

// Smooth scroll for in-page anchor links
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener("click", function (e) {
    var id = link.getAttribute("href").slice(1);
    var target = id && document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});`;

export function createDefaultFiles() {
  return {
    "index.html": HTML,
    "styles.css": CSS,
    "script.js": JS,
  };
}

export const DEFAULT_PROJECT_NAME = "Cascade Plumbing";
