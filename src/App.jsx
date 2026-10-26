import React, { useState } from 'react';

const assets = '/assets/';

function Brand({ light = false }) {
  return <a className={`brand ${light ? 'brand-light' : ''}`} href="#top" aria-label="SA Educate home">
    <svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="7" r="5" fill="currentColor"/><path d="M25 17c-7-7-17-7-22-4v26c8-1 16 1 22 7V17Zm0 0c7-7 17-7 22-4v26c-8-1-16 1-22 7V17Z" fill="currentColor"/><path d="M25 18v27" stroke={light ? '#fff' : '#fff'} strokeWidth="2"/></svg>
    <span>SA Educate</span>
  </a>;
}

const logos = [
  { src: 'logo-egov.png', alt: 'Gauteng Province e-Government' },
  { src: 'logo-dbe.png', alt: 'Department of Basic Education' },
  { src: 'logo-dhet.png', alt: 'Department of Higher Education and Training' },
  { src: 'logo-sita.png', alt: 'SITA' },
  { src: 'logo-nsfas.png', alt: 'NSFAS' },
];

const faqs = [
  ['Can I edit generated lessons?', 'Yes. You can review and edit a lesson before assigning it to a class.'],
  ['What can I upload?', 'The lesson workflow starts with a PDF. Documents, videos, and images are planned options.'],
  ['How does the help feature work?', 'Learners can open an explanation with text, audio, and a sign-language video.'],
  ['Will more languages be available?', 'The design supports switching lesson languages as more translations become available.'],
];

function App() {
  const [logoOffset, setLogoOffset] = useState(0);
  const [language, setLanguage] = useState('English');
  const [signInOpen, setSignInOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const orderedLogos = [...logos.slice(logoOffset), ...logos.slice(0, logoOffset)];
  const start = () => setSignInOpen(true);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" id="top">
      <div className="header-inner">
        <Brand />
        <div className="header-actions">
          <label className="language-control"><svg className="globe" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c-4 4-6 8-6 12s2 8 6 12M16 4c4 4 6 8 6 12s-2 8-6 12"/></svg><span>Language: </span><select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value)}><option>English</option><option>isiZulu</option><option>Sesotho</option><option>Afrikaans</option></select></label>
          <span className="header-rule" aria-hidden="true" />
          <button className="sign-in" onClick={() => setSignInOpen(true)}>Sign in</button>
        </div>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 id="hero-title">Quality education<br/>for a brighter<br/>South Africa.</h1>
            <p>Create engaging lessons from the<br className="desktop-break"/> material you already have.</p>
            <div className="hero-buttons"><button className="button button-primary" onClick={start}>Get started</button><button className="button button-outline" onClick={() => setSignInOpen(true)}>I already have an account</button></div>
          </div>
          <img className="hero-illustration" src={`${assets}hero-educator.png`} alt="Educator holding a lesson plan and tablet" />
        </div>
      </section>

      <section className="collaborators" aria-labelledby="collaborators-title">
        <h2 id="collaborators-title">Potential public-sector collaborators</h2>
        <div className="logo-carousel">
          <button className="carousel-arrow" onClick={() => setLogoOffset((logoOffset + logos.length - 1) % logos.length)} aria-label="Previous logos">‹</button>
          <div className="logo-list" aria-live="polite">{orderedLogos.map(item => <div className="logo-item" key={item.src}><img src={`${assets}${item.src}`} alt={item.alt}/></div>)}</div>
          <button className="carousel-arrow" onClick={() => setLogoOffset((logoOffset + 1) % logos.length)} aria-label="Next logos">›</button>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading"><span className="spark-left" aria-hidden="true">⌁</span><h2 id="how-title">From a PDF to a lesson learners love.</h2><span className="spark-right" aria-hidden="true">⌁</span><p>Turn your existing materials into engaging, accessible lessons in just a few steps.</p></div>
        <div className="steps">
          <article className="step-card"><span className="step-number">1</span><img src={`${assets}step-upload.png`} alt="PDF being uploaded"/><h3>Upload material</h3><p>Add a PDF, document, video<br/>or image from your device.</p></article>
          <span className="step-arrow" aria-hidden="true">⇢</span>
          <article className="step-card"><span className="step-number">2</span><img src={`${assets}step-review.png`} alt="Generated lesson preview"/><h3>Review the lesson</h3><p>We turn your content into<br/>a structured, interactive lesson.</p></article>
          <span className="step-arrow" aria-hidden="true">⇢</span>
          <article className="step-card"><span className="step-number">3</span><img src={`${assets}step-assign.png`} alt="Three learners"/><h3>Assign to your class</h3><p>Share with your learners<br/>and track their progress.</p></article>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-title">
        <div className="dashboard-copy"><h2 id="dashboard-title">Everything you need<br/>to keep lessons moving.</h2><p>Organise your materials, create engaging lessons, assign to classes, and see real progress — all in one simple workspace.</p>
          <Feature icon="book" title="All your materials in one place">Upload PDFs, videos, images and more.</Feature>
          <Feature icon="lesson" title="Interactive, accessible lessons">Turn content into activities, quizzes and summaries.</Feature>
          <Feature icon="chart" title="Track learner progress">See completion, understanding and class insights.</Feature>
        </div>
        <img className="dashboard-preview" src={`${assets}dashboard-preview.png`} alt="Educator dashboard preview showing classes, lesson plans, and a lesson path"/>
      </section>

      <section className="accessibility-section" aria-labelledby="access-title">
        <img className="access-preview" src={`${assets}accessibility-preview.png`} alt="Lesson question with text, audio and sign-language explanation options" />
        <div className="access-copy"><h2 id="access-title">One lesson.<br/>More ways to<br/>understand.</h2><p>Read it, hear it, or watch the explanation in sign language.</p>
          <Feature icon="document" title="Read">Clear, simple explanations.</Feature>
          <Feature icon="volume" title="Listen">Hear the question and explanation.</Feature>
          <Feature icon="hand" title="Watch">See the explanation in sign language.</Feature>
        </div>
      </section>

      <section className="progress-section" aria-labelledby="progress-title">
        <div className="progress-copy"><h2 id="progress-title">Every step feels<br/>like progress.</h2><p>Short, focused lessons help you<br/>build your skills with confidence.</p></div>
        <img src={`${assets}progress-preview.png`} alt="Water Cycle lesson path alongside correct and incorrect feedback"/>
      </section>

      <section className="benefits-section" aria-labelledby="benefits-title"><h2 id="benefits-title">Built for the whole learning journey.</h2><div className="benefit-grid"><Benefit icon="book" title="Plan with confidence">Turn your existing materials<br/>into clear, structured lessons.</Benefit><Benefit icon="play" title="Learn at your own pace">Short, focused lessons that<br/>fit your time and goals.</Benefit><Benefit icon="bulb" title="Understand every answer">Clear explanations help<br/>you learn and remember.</Benefit></div></section>

      <section className="faq-section" aria-labelledby="faq-title"><h2 id="faq-title">Frequently asked questions</h2><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-row" key={question}><button aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><span className={`chevron ${openFaq === index ? 'open' : ''}`} aria-hidden="true">⌄</span></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>

      <section className="final-cta" aria-labelledby="cta-title"><h2 id="cta-title">Make every lesson count.</h2><button className="button button-white" onClick={start}>Get started</button></section>
    </main>
    <footer className="footer"><Brand light/><nav aria-label="Footer"><a href="#top">About</a><a href="#access-title">Accessibility</a><button onClick={() => setContactOpen(true)}>Contact</button></nav></footer>

    {signInOpen && <div className="dialog-backdrop" onMouseDown={() => setSignInOpen(false)}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={event => event.stopPropagation()}><button className="dialog-close" onClick={() => setSignInOpen(false)} aria-label="Close">×</button><Brand/><h2 id="dialog-title">Welcome back</h2><p>Sign in to your educator account</p><form onSubmit={event => {event.preventDefault(); setSignInOpen(false);}}><label>Email address<input type="email" required autoFocus/></label><label>Password<input type="password" required/></label><button className="button button-primary" type="submit">Sign in</button></form></div></div>}
    {contactOpen && <div className="dialog-backdrop" onMouseDown={() => setContactOpen(false)}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title" onMouseDown={event => event.stopPropagation()}><button className="dialog-close" onClick={() => setContactOpen(false)} aria-label="Close">×</button><Brand/><h2 id="contact-title">Contact SA Educate</h2><p>Contact details will be added when the platform launches.</p></div></div>}
  </>;
}

function Icon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: '3.2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    book: <><path d="M24 10C18 6 11 6 5 9v27c8-2 14-1 19 3 5-4 11-5 19-3V9c-6-3-13-3-19 1Z"/><path d="M24 10v29"/></>,
    lesson: <><rect x="7" y="7" width="34" height="34" rx="4"/><path d="M15 16h19M15 23h19M15 30h12"/></>,
    chart: <><path d="M7 40h35"/><rect x="10" y="25" width="6" height="13" rx="1"/><rect x="22" y="15" width="6" height="23" rx="1"/><rect x="34" y="8" width="6" height="30" rx="1"/></>,
    document: <><path d="M12 5h18l8 8v29H12Z"/><path d="M29 5v9h9M17 22h15M17 28h15M17 34h10"/></>,
    volume: <><path d="M6 19h9l9-8v26l-9-8H6Z"/><path d="M31 17c4 4 4 10 0 14M37 11c7 7 7 19 0 26"/></>,
    hand: <><path d="M14 42c-5-5-7-11-5-16 1-3 3-4 5-2l4 5V10c0-4 5-4 5 0v14-17c0-4 5-4 5 0v17-14c0-4 5-4 5 0v14-10c0-4 5-4 5 0v15c0 7-3 11-8 13Z"/></>,
    play: <><circle cx="24" cy="24" r="20" fill="currentColor" stroke="none"/><path d="m20 14 15 10-15 10Z" fill="#fff" stroke="none"/></>,
    bulb: <><path d="M15 31c-3-3-5-7-5-11a14 14 0 0 1 28 0c0 4-2 8-5 11l-2 3H17Z"/><path d="M18 39h12M20 44h8M24 10v-4M7 11l-3-3M41 11l3-3M5 24H2M43 24h3"/></>,
  };
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}>{paths[name]}</svg>;
}
function Feature({ icon, title, children }) { return <div className="feature"><span className="feature-icon" aria-hidden="true"><Icon name={icon}/></span><div><h3>{title}</h3><p>{children}</p></div></div>; }
function Benefit({ icon, title, children }) { return <article className="benefit"><span className="benefit-icon" aria-hidden="true"><Icon name={icon}/></span><div><h3>{title}</h3><p>{children}</p></div></article>; }

export default App;
