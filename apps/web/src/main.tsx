import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <div className="page">
      <header className="masthead">
        <a className="brand" href="/" aria-label="Enterprise AI OS home">
          <span className="brand-mark" aria-hidden="true">e</span>
          <span>enterprise<span className="brand-light"> / AI OS</span></span>
        </a>
        <a className="header-link" href="#foundation">The foundation <span aria-hidden="true">↗</span></a>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> A considered beginning</p>
            <h1 id="hero-title">Intelligence.<br />With intention.</h1>
            <p className="hero-description">A clearer foundation for the way your enterprise works. Built to bring people, systems, and AI together.</p>
            <a className="primary-link" href="#foundation">Explore the foundation <span aria-hidden="true">↓</span></a>
            <p className="edition">FOUNDATION EDITION <span>001 / 2026</span></p>
          </div>
          <div className="art-panel" aria-hidden="true">
            <div className="art-grid" />
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="core"><span>e</span></div>
            <span className="art-label art-label-top">DESIGNED FOR CONNECTION</span>
            <span className="art-label art-label-bottom">A STRONGER CENTER. A CLEARER PATH.</span>
            <span className="art-coordinate">[ 01 — 03 ]</span>
          </div>
        </section>

        <section id="foundation" className="foundation" aria-labelledby="foundation-title">
          <div className="section-heading"><p className="eyebrow">The foundation</p><h2 id="foundation-title">Good systems start<br />with clear principles.</h2></div>
          <div className="principles">
            <article><span className="principle-number">01 /</span><h3>Clarity by design</h3><p>A focused workspace, with room to grow. Complexity earns its place.</p></article>
            <article><span className="principle-number">02 /</span><h3>Trust at the core</h3><p>Security and tenant isolation are requirements for every future capability.</p></article>
            <article><span className="principle-number">03 /</span><h3>People in the loop</h3><p>Intelligent tools should support good judgment and accountable decisions.</p></article>
          </div>
        </section>
      </main>

      <footer><span>Enterprise AI OS</span><p>Thoughtfully built. Just getting started.</p><span>Foundation / 001</span></footer>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StrictMode><App /></StrictMode>);
