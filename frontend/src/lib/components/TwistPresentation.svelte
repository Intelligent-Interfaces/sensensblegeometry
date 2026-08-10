<script lang="ts">
  import { onMount } from 'svelte';

  interface Slide {
    id: string;
    title: string;
    subtitle: string;
    category: string;
  }

  const slides: Slide[] = [
    { id: 'title', title: 'Twist Science', subtitle: 'Informing Device Resiliency Through Cyclogenesis', category: 'Vision & Prologue' },
    { id: 'narrative', title: 'Air Capital & Extropic Flexing', subtitle: 'A Personal Story from Wichita, KS to Resilient Machines', category: 'Background' },
    { id: 'problem', title: 'The Problem: Distortions & Alarm Fatigue', subtitle: 'Why Scalar Models & Traditional Warning Systems Fail', category: 'Motivation' },
    { id: 'abstract', title: 'Geometric Deep Learning & Clifford Algebra', subtitle: 'Replacing Scalar Mixers with the Geometric Product', category: 'Core Science' },
    { id: 'approach', title: 'Approach & Artifact Ecosystem', subtitle: 'The Intelligent Interfaces TwistScience Repository', category: 'Methodology' },
    { id: 'material', title: 'Multi-Scale Material & Domain Spectrum', subtitle: 'From Dandelions & Twistronics to Multi-Sensory Interfaces', category: 'Engineering & Art' },
    { id: 'concepts', title: 'Conceptual Pillars', subtitle: 'Representation Learning, Aesthetics, & Pragmatism', category: 'Framework' },
    { id: 'call_to_action', title: 'Call to Action: Opening the Door', subtitle: 'Audio-Vision, VLA, & Community-Generated Design Languages', category: 'Future & Deliberation' },
  ];

  let currentSlideIdx = $state(0);
  let showNotes = $state(false);

  function prevSlide() {
    if (currentSlideIdx > 0) currentSlideIdx--;
  }

  function nextSlide() {
    if (currentSlideIdx < slides.length - 1) currentSlideIdx++;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'Space') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key.toLowerCase() === 'n') {
      showNotes = !showNotes;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="presentation-container">
  <!-- Top Progress Bar & Header -->
  <div class="deck-header">
    <div class="deck-title-group">
      <span class="deck-badge">Twist Science Keynote</span>
      <span class="deck-cat">{slides[currentSlideIdx].category}</span>
    </div>

    <!-- Slide Thumbnails / Indicator -->
    <div class="slide-dots">
      {#each slides as slide, idx}
        <button
          type="button"
          class="dot-btn"
          class:active={currentSlideIdx === idx}
          onclick={() => currentSlideIdx = idx}
          title="{idx + 1}. {slide.title}"
        >
          <span class="dot-num">{idx + 1}</span>
        </button>
      {/each}
    </div>

    <div class="header-controls">
      <button type="button" class="notes-toggle" class:active={showNotes} onclick={() => showNotes = !showNotes}>
        {showNotes ? 'Hide Speaker Notes (N)' : 'Speaker Notes (N)'}
      </button>
    </div>
  </div>

  <!-- Main Slide Viewport -->
  <div class="slide-viewport">
    <!-- SLIDE 1: TITLE -->
    {#if currentSlideIdx === 0}
      <div class="slide-card title-slide">
        <div class="hero-tag">INTELLECTUAL FRAMEWORK & SYSTEM RESILIENCE</div>
        <h1 class="main-title">Twist Science</h1>
        <h2 class="main-subtitle">Informing Device Resiliency Through Cyclogenesis</h2>
        
        <div class="author-block">
          <p class="author-name">Erick Oduniyi</p>
          <p class="author-affil">Institute for Artificial Intelligence & Fundamental Interactions (IAIFI) — Summer 2026</p>
          <p class="author-group">Intelligent Interfaces Group</p>
        </div>

        <div class="slide-highlight-box">
          <p>
            "So this is a story about many things, but in the end we want to design and engineer devices that are resilient to the plurality of distortions. To do that requires us to understand the particular and general phenomena of twisting at every scale possible."
          </p>
        </div>
      </div>

    <!-- SLIDE 2: PERSONAL NARRATIVE & ORIGIN -->
    {:else if currentSlideIdx === 1}
      <div class="slide-card narrative-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Background & Personal Origin</span>
          <h2>Wichita, KS & The Extropic Reality</h2>
        </div>

        <div class="two-col-grid">
          <div class="col-card highlight-left">
            <div class="card-icon">✈️</div>
            <h3>The Air Capital of the World</h3>
            <p>
              Growing up in Wichita, Kansas meant growing up with planes constantly flying overhead, strong winds, and severe tornadoes. Over time, these environmental forces accumulate.
            </p>
            <p class="quote-sub">
              "Planes and rockets must stay in the sky, and when they don't or can't land—irrespective of whatever random or pseudo-random perturbation or disaster—it sucks. We would like to steer around it."
            </p>
          </div>

          <div class="col-card highlight-right">
            <div class="card-icon">🌀</div>
            <h3>Flexing vs. Hardening</h3>
            <p>
              The extropic nature of reality requests us to <strong>flex more</strong> while freezing or hardening structures that enabled our historical success.
            </p>
            <div class="tool-stack">
              <span class="tool-tag">Media Technology</span>
              <span class="tool-tag">Architecture</span>
              <span class="tool-tag">Computing Systems</span>
            </div>
            <p class="tool-desc">
              Leveraging these general tools to engineer flexible futures for complex, physical systems under rotational stress.
            </p>
          </div>
        </div>
      </div>

    <!-- SLIDE 3: THE PROBLEM & MOTIVATION -->
    {:else if currentSlideIdx === 2}
      <div class="slide-card problem-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Motivation & Distortion Theory</span>
          <h2>Rate-Distortion & The "Cry Wolf" Failure</h2>
        </div>

        <div class="three-col-grid">
          <div class="col-card">
            <span class="card-num">01</span>
            <h3>Rate-Distortion Theory</h3>
            <p>
              Devices operating in extreme environments face a plurality of signal distortions. Traditional scalar warning systems discard structural rotational information.
            </p>
          </div>

          <div class="col-card warning-card">
            <span class="card-num">02</span>
            <h3>P-Bifurcations vs. D-Bifurcations</h3>
            <p>
              Stochastic noise causes harmless <em>Phenomenological (P) bifurcations</em>. Scalar models mistake these for true <em>Dynamical (D) bifurcations</em>, triggering catastrophic alarm fatigue.
            </p>
          </div>

          <div class="col-card">
            <span class="card-num">03</span>
            <h3>Antifragility in High Mixing</h3>
            <p>
              Engineering devices to be responsive and antifragile under typhoons, turbulence, and extreme physical mixing requires twisting science to explore breaking points.
            </p>
          </div>
        </div>
      </div>

    <!-- SLIDE 4: THE ABSTRACT & CORE SCIENCE -->
    {:else if currentSlideIdx === 3}
      <div class="slide-card abstract-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Core Scientific Pipeline</span>
          <h2>Clifford Algebra $\text{"{"}Cl{"}"}(3,0)$ & Continuous-Time Liquid Networks</h2>
        </div>

        <div class="abstract-box">
          <p class="abstract-text">
            "We propose a Geometric Deep Learning framework grounded in Clifford Algebra that replaces standard neural modules with the geometric product ($uv = u \cdot v + u \wedge v$), natively encoding topological rotational information. By bridging continuous-time dynamics to hardware via Wave Digital Filters and Liquid Resistance-Capacitance networks, and defining safe operating states on Kähler-Einstein manifolds, we present a complete pipeline for resilient device operation."
          </p>
        </div>

        <div class="four-pill-grid">
          <div class="pill-card">
            <span class="pill-title">Geometric Product</span>
            <span class="pill-sub">Soft Inductive Bias via $u \cdot v + u \wedge v$</span>
          </div>
          <div class="pill-card">
            <span class="pill-title">Liquid Learning</span>
            <span class="pill-sub">State-dependent ODE time-constants ($\tau$)</span>
          </div>
          <div class="pill-card">
            <span class="pill-title">Wave Digital Filters</span>
            <span class="pill-sub">Passive, delay-free continuous hardware discretization</span>
          </div>
          <div class="pill-card">
            <span class="pill-title">Kähler-Einstein</span>
            <span class="pill-sub">Basin of attraction for safe operating manifold</span>
          </div>
        </div>
      </div>

    <!-- SLIDE 5: APPROACH & ARTIFACT ECOSYSTEM -->
    {:else if currentSlideIdx === 4}
      <div class="slide-card approach-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Approach & Artifacts</span>
          <h2>The Intelligent Interfaces `twistscience` Ecosystem</h2>
        </div>

        <div class="repo-banner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>github.com/Intelligent-Interfaces/twistscience</span>
        </div>

        <div class="two-col-grid">
          <div class="col-card">
            <h3>Reproducible Exploration</h3>
            <p>
              We created a rich suite of artifacts ranging from interactive user interfaces to Jupyter notebooks for exploring and reproducing the design and science of related complex systems.
            </p>
          </div>
          <div class="col-card">
            <h3>Emerging Twistronics</h3>
            <p>
              Bridging computing architectures to the emerging domain of <strong>twisttronics</strong>—exploiting rotational misorientation angles in 2D materials and physical sensing layers.
            </p>
          </div>
        </div>
      </div>

    <!-- SLIDE 6: MULTI-SCALE MATERIAL & DOMAIN SPECTRUM -->
    {:else if currentSlideIdx === 5}
      <div class="slide-card material-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Material & Domain Spectrum</span>
          <h2>Twisting at Every Scale</h2>
        </div>

        <div class="spectrum-grid">
          <div class="spec-card">
            <h4>Engineering & Wind</h4>
            <ul>
              <li>Developing Wind Power Projects</li>
              <li>Wind Turbine Over-spin Control</li>
            </ul>
          </div>
          <div class="spec-card">
            <h4>Computation & Physics</h4>
            <ul>
              <li>Cyclogenetic Dandelions, DNA</li>
              <li>Umbrellas, Mazes & Mixing</li>
              <li>Geometric Algebra $\text{"{"}Cl{"}"}(3,0)$</li>
            </ul>
          </div>
          <div class="spec-card">
            <h4>Material Science</h4>
            <ul>
              <li>Quantum Dots (Delivery)</li>
              <li>Twistronics (Sensors)</li>
              <li>Optics & Lenses</li>
            </ul>
          </div>
          <div class="spec-card wide">
            <h4>Interface & Design (Multi-Sensory Modalities)</h4>
            <div class="sense-tags">
              <span>Light (Sight)</span>
              <span>Sound (Hearing)</span>
              <span>Haptics (Touch)</span>
              <span>Acceleration (Proprioception)</span>
              <span>Vision (Camera)</span>
              <span>Language</span>
              <span>Time</span>
              <span>Space</span>
              <span class="nth">Nth Sense</span>
            </div>
          </div>
        </div>
      </div>

    <!-- SLIDE 7: CONCEPTUAL PILLARS -->
    {:else if currentSlideIdx === 6}
      <div class="slide-card concepts-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Conceptual Framework</span>
          <h2>Representation, Aesthetics, & Pragmatism</h2>
        </div>

        <div class="three-pillar-grid">
          <div class="pillar-card">
            <div class="pillar-header">Representation Learning</div>
            <div class="pillar-domain">Domain: Math</div>
            <p>Formalizing geometric structure across Python, R, and Julia in mathematical modeling.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-header">Aesthetics</div>
            <div class="pillar-domain">Domain: Computation</div>
            <p>Creating expressive, hardware-emulating software interfaces that make complex dynamics tangible.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-header">Pragmatism</div>
            <div class="pillar-domain">Domain: Language</div>
            <p>Translating abstract geometric theorems into actionable, real-world device resiliency.</p>
          </div>
        </div>
      </div>

    <!-- SLIDE 8: CALL TO ACTION -->
    {:else if currentSlideIdx === 7}
      <div class="slide-card cta-slide">
        <div class="slide-header-area">
          <span class="slide-category-tag">Call to Action</span>
          <h2>Opening the Door</h2>
        </div>

        <div class="cta-grid">
          <div class="cta-card">
            <h3>Audio-Vision & VLA</h3>
            <p>Integrating Visual-Language-Action models and procedural sonification across the spectrum of intelligence.</p>
          </div>
          <div class="cta-card">
            <h3>Infrastructure, Interfaces, & Interactions</h3>
            <p>Building community-generated design languages for open, collaborative technology.</p>
          </div>
          <div class="cta-card wide">
            <h3>Identity, Community, Collaboration, & Cures</h3>
            <p class="delib-text">
              Deliberation across <strong>Flora, Funga, Fauna</strong> — repairing science, devices, and ourselves.
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Speaker Notes Overlay -->
  {#if showNotes}
    <div class="notes-panel">
      <div class="notes-header">
        <span>SPEAKER NOTES — SLIDE {currentSlideIdx + 1}: {slides[currentSlideIdx].title}</span>
        <button type="button" class="close-notes" onclick={() => showNotes = false}>×</button>
      </div>
      <div class="notes-body">
        {#if currentSlideIdx === 0}
          <p>Open by framing the broader philosophical goal: we are building resilient devices in an increasingly volatile world. Introduce the concept of "twisting science" as both a method and a mission.</p>
        {:else if currentSlideIdx === 1}
          <p>Share the personal Wichita background—growing up under aviation pathways and tornado warnings. Emphasize that while we cannot prevent natural chaos, we can engineer systems that flex rather than shatter.</p>
        {:else if currentSlideIdx === 2}
          <p>Explain rate-distortion theory and the "cry wolf" effect. Detail how scalar thresholds fail during P-bifurcations (noise) versus D-bifurcations (true loss of stability).</p>
        {:else if currentSlideIdx === 3}
          <p>Introduce the Clifford Algebra Cl(3,0) solution: geometric product encoding both scalar alignment and bivector rotation. Highlight continuous-time Liquid Learning and Wave Digital Filters.</p>
        {:else if currentSlideIdx === 4}
          <p>Highlight the open-source artifacts in the Intelligent Interfaces twistscience repository. Connect to twistronics and physical sensing interfaces.</p>
        {:else if currentSlideIdx === 5}
          <p>Walk through the multi-scale spectrum—from dandelions and DNA to wind turbines, optics, and Nth-sense multi-sensory interfaces (sound, haptics, proprioception).</p>
        {:else if currentSlideIdx === 6}
          <p>Discuss the triadic conceptual framework: Representation Learning (Math), Aesthetics (Computation), and Pragmatism (Language) implemented in Python, R, and Julia.</p>
        {:else if currentSlideIdx === 7}
          <p>Conclude with the call to action: Audio-Vision, Visual-Language-Action, community design languages, and deliberation across Flora, Funga, and Fauna.</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Footer Navigation Bar -->
  <div class="deck-footer">
    <button type="button" class="nav-btn" onclick={prevSlide} disabled={currentSlideIdx === 0}>
      ← Previous
    </button>
    <span class="slide-count">Slide {currentSlideIdx + 1} of {slides.length}</span>
    <button type="button" class="nav-btn" onclick={nextSlide} disabled={currentSlideIdx === slides.length - 1}>
      Next →
    </button>
  </div>
</div>

<style>
  .presentation-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-chassis);
    color: var(--text-main);
    font-family: var(--font-family);
    position: relative;
    overflow: hidden;
  }

  .deck-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--card-border);
    flex-shrink: 0;
  }

  .deck-title-group { display: flex; align-items: center; gap: 10px; }
  .deck-badge { font-size: 0.72rem; font-weight: 800; color: var(--accent-fuse); text-transform: uppercase; letter-spacing: 0.08em; }
  .deck-cat { font-size: 0.72rem; color: var(--text-muted); }

  .slide-dots { display: flex; gap: 6px; }
  .dot-btn {
    width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--card-border);
    background: var(--card-bg); color: var(--text-muted); font-size: 0.7rem; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .dot-btn:hover { border-color: var(--accent-fuse); color: var(--accent-fuse); }
  .dot-btn.active { background: var(--accent-fuse); color: #fff; border-color: var(--accent-fuse); }

  .notes-toggle {
    padding: 5px 12px; border-radius: 6px; border: 1px solid var(--card-border);
    background: var(--card-bg); color: var(--text-muted); font-size: 0.7rem; cursor: pointer;
  }
  .notes-toggle.active { background: var(--accent-vis); color: #fff; border-color: var(--accent-vis); }

  .slide-viewport {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 24px; overflow: auto;
  }

  .slide-card {
    width: 100%; max-width: 960px; min-height: 520px;
    background: var(--panel-bg); border: 1px solid var(--card-border);
    border-radius: var(--card-radius); padding: 36px;
    display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: var(--card-shadow); animation: fadeIn 0.25s ease-out;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .hero-tag { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.12em; color: var(--accent-fuse); }
  .main-title { font-size: 2.8rem; font-weight: 800; margin: 8px 0; color: var(--text-main); }
  .main-subtitle { font-size: 1.3rem; font-weight: 500; color: var(--text-muted); margin-bottom: 24px; }

  .author-block { border-left: 3px solid var(--accent-fuse); padding-left: 14px; margin-bottom: 24px; }
  .author-name { font-size: 1rem; font-weight: 700; color: var(--text-main); }
  .author-affil { font-size: 0.8rem; color: var(--text-muted); }
  .author-group { font-size: 0.75rem; color: var(--accent-vis); font-weight: 600; }

  .slide-highlight-box {
    background: var(--bg-chassis); border: 1px solid var(--card-border);
    border-radius: 12px; padding: 18px 24px; font-style: italic; font-size: 0.95rem; line-height: 1.6;
  }

  .slide-header-area { margin-bottom: 20px; }
  .slide-category-tag { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-fuse); }
  .slide-header-area h2 { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-top: 4px; }

  .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; }
  .three-col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; flex: 1; }
  .three-pillar-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; flex: 1; }

  .col-card {
    background: var(--bg-chassis); border: 1px solid var(--card-border);
    border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px;
  }
  .warning-card { border-color: var(--accent-aud); }
  .card-icon { font-size: 1.8rem; }
  .card-num { font-size: 1.2rem; font-weight: 900; color: var(--accent-fuse); }
  .col-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); }
  .col-card p { font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); }
  .quote-sub { font-style: italic; color: var(--text-main); border-top: 1px solid var(--card-border); padding-top: 10px; }

  .tool-stack { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .tool-tag { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: var(--panel-bg); border: 1px solid var(--card-border); color: var(--accent-fuse); }

  .abstract-box { background: var(--bg-chassis); border-left: 4px solid var(--accent-fuse); padding: 18px 24px; border-radius: 8px; margin-bottom: 20px; }
  .abstract-text { font-size: 0.9rem; line-height: 1.6; color: var(--text-main); }

  .four-pill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pill-card { background: var(--bg-chassis); border: 1px solid var(--card-border); padding: 12px 16px; border-radius: 10px; display: flex; flex-direction: column; }
  .pill-title { font-size: 0.85rem; font-weight: 700; color: var(--accent-vis); }
  .pill-sub { font-size: 0.72rem; color: var(--text-muted); }

  .repo-banner { display: flex; align-items: center; gap: 10px; background: var(--bg-chassis); border: 1px solid var(--card-border); padding: 12px 18px; border-radius: 10px; font-family: monospace; font-size: 0.85rem; color: var(--accent-fuse); margin-bottom: 20px; }

  .spectrum-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; flex: 1; }
  .spec-card { background: var(--bg-chassis); border: 1px solid var(--card-border); padding: 16px; border-radius: 10px; }
  .spec-card.wide { grid-column: span 3; }
  .spec-card h4 { font-size: 0.9rem; font-weight: 700; color: var(--accent-fuse); margin-bottom: 8px; }
  .spec-card ul { padding-left: 18px; font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }

  .sense-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .sense-tags span { font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; background: var(--panel-bg); border: 1px solid var(--card-border); color: var(--text-main); font-weight: 600; }
  .sense-tags .nth { background: var(--accent-fuse); color: #fff; }

  .pillar-card { background: var(--bg-chassis); border: 1px solid var(--card-border); padding: 20px; border-radius: 12px; }
  .pillar-header { font-size: 1.1rem; font-weight: 800; color: var(--accent-fuse); }
  .pillar-domain { font-size: 0.75rem; font-weight: 700; color: var(--accent-vis); margin-bottom: 10px; }

  .cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .cta-card { background: var(--bg-chassis); border: 1px solid var(--card-border); padding: 20px; border-radius: 12px; }
  .cta-card.wide { grid-column: span 2; border-color: var(--accent-fuse); }
  .cta-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--accent-fuse); margin-bottom: 6px; }
  .delib-text { font-size: 1rem; color: var(--text-main); font-weight: 600; }

  .notes-panel {
    position: absolute; bottom: 60px; right: 24px; width: 380px;
    background: var(--panel-bg); border: 1px solid var(--accent-vis);
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    overflow: hidden; animation: slideUp 0.2s ease-out; z-index: 10;
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .notes-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--accent-vis); color: #fff; font-size: 0.68rem; font-weight: 800; }
  .close-notes { border: none; background: transparent; color: #fff; font-size: 1.1rem; cursor: pointer; }
  .notes-body { padding: 14px; font-size: 0.82rem; line-height: 1.5; color: var(--text-main); }

  .deck-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 24px; background: var(--panel-bg); border-top: 1px solid var(--card-border);
    flex-shrink: 0;
  }
  .nav-btn {
    padding: 8px 18px; border-radius: 8px; border: 1px solid var(--card-border);
    background: var(--card-bg); color: var(--text-main); font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .nav-btn:hover:not(:disabled) { background: var(--accent-fuse); color: #fff; border-color: var(--accent-fuse); }
  .nav-btn:disabled { opacity: 0.4; cursor: default; }
  .slide-count { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); font-family: monospace; }
</style>
