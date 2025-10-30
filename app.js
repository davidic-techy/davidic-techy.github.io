/* ---
   APP.JS
   This file contains all "highly advanced" logic.
   
   This is the UPDATED version with:
   1. Mobile Navigation Toggle logic
   2. Live Footer Clock
   3. Disabling expensive animations (Tilt, Scramble) on mobile
   4. Touch event support for the Skill Graph
--- */

document.addEventListener("DOMContentLoaded", () => {
  // --- FEATURE 1: MOBILE NAVIGATION TOGGLE ---
  const navToggle = document.getElementById("mobile-nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const body = document.body;

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      // Toggle classes on nav and body
      mainNav.classList.toggle("nav-open");
      body.classList.toggle("nav-open");
    });

    // Close menu when a link is clicked
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("nav-open");
        body.classList.remove("nav-open");
      });
    });
  }

  // --- FEATURE 2: LIVE FOOTER CLOCK ---
  const timeEl = document.getElementById("footer-time");

  function updateTime() {
    if (!timeEl) return;

    try {
      // Get time in Lagos, WAT (UTC+1)
      const now = new Date();
      // Use 'Africa/Lagos' to ensure it's correct even with daylight saving changes
      const watTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Africa/Lagos" })
      );

      const hours = watTime.getHours().toString().padStart(2, "0");
      const minutes = watTime.getMinutes().toString().padStart(2, "0");

      timeEl.textContent = `${hours}:${minutes} WAT (UTC+1)`;
    } catch (e) {
      console.error("Error updating time:", e);
      // Fallback if time zone is not found
      timeEl.textContent = "UTC+1";
    }
  }

  updateTime(); // Run once immediately
  setInterval(updateTime, 10000); // Update every 10 seconds

  // --- FEATURE 3: TEXT SCRAMBLE ---

  /**
   * The TextScrambleEffect class handles the "decoding" animation.
   * It uses requestAnimationFrame for a smooth, performant effect.
   */
  class TextScrambleEffect {
    constructor(el) {
      this.el = el;
      // The set of characters to use for scrambling
      this.chars = "!<>-_\\/[]{}—=+*^?#________";
      this.update = this.update.bind(this);
    }

    setText(newText) {
      const oldText = this.el.innerText;
      const length = Math.max(oldText.length, newText.length);
      // This promise resolves when the animation is complete
      this.promise = new Promise((resolve) => (this.resolve = resolve));

      // `queue` stores the animation steps for each character
      this.queue = [];
      for (let i = 0; i < length; i++) {
        const from = oldText[i] || "";
        const to = newText[i] || "";
        const start = Math.floor(Math.random() * 40);
        const end = start + Math.floor(Math.random() * 40);
        this.queue.push({ from, to, start, end });
      }

      cancelAnimationFrame(this.frameRequest);
      this.frame = 0;
      this.update();
    }

    update() {
      let output = "";
      let complete = 0;
      for (let i = 0, n = this.queue.length; i < n; i++) {
        let { from, to, start, end, char } = this.queue[i];
        if (this.frame >= end) {
          complete++;
          output += to;
        } else if (this.frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = this.randomChar();
            this.queue[i].char = char;
          }
          // Use innerHTML to render the span for the scramble char
          output += `<span class="scramble-char">${char}</span>`;
        } else {
          output += from;
        }
      }
      this.el.innerHTML = output;
      if (complete === this.queue.length) {
        this.resolve();
      } else {
        this.frameRequest = requestAnimationFrame(this.update);
        this.frame++;
      }
    }

    randomChar() {
      return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
  }

  // --- Initialize Scramble Effect ---
  const scrambleElements = document.querySelectorAll('[data-scramble="true"]');
  scrambleElements.forEach((el) => {
    const scrambler = new TextScrambleEffect(el);
    const originalText = el.textContent; // Use textContent for the original text

    // Scramble on load for hero title
    if (el.classList.contains("hero-title")) {
      scrambler.setText(originalText);
    }

    // Only add hover effect on non-touch devices
    el.addEventListener("mouseover", () => {
      if (window.innerWidth > 820) {
        scrambler.setText(originalText);
      }
    });
  });

  // --- FEATURE 4: 3D TILT EFFECT ---

  /**
   * Attaches the 3D tilt effect to all elements with [data-tilt="true"]
   * This is a "vanilla JS" implementation of a popular tilt effect.
   */
  const tiltElements = document.querySelectorAll('[data-tilt="true"]');

  // Disable tilt on mobile for performance and usability
  if (window.innerWidth > 820) {
    tiltElements.forEach((el) => {
      const maxTilt = 15; // Max tilt in degrees

      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position inside element
        const y = e.clientY - rect.top; // y position inside element

        const width = el.offsetWidth;
        const height = el.offsetHeight;

        // Calculate tilt values (from -maxTilt to +maxTilt)
        const rotateX = (maxTilt * (y - height / 2)) / (height / 2);
        const rotateY = -(maxTilt * (x - width / 2)) / (width / 2);

        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform =
          "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
      });
    });
  }

  // --- FEATURE 5: SKILL GRAPH ---

  /**
   * The SkillGraph class creates and animates the interactive node map.
   * It's a "mini" physics engine using vanilla JS.
   */
  class SkillGraph {
    constructor(containerId, nodesData, linksData) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.error("Skill graph container not found!");
        return;
      }
      this.nodes = nodesData;
      this.links = linksData;
      this.nodeElements = [];
      this.linkElements = [];

      // Physics parameters
      this.repulsion = 5000;
      this.stiffness = 0.05;
      this.damping = 0.75;
      this.targetDist = 100;

      // Adjust physics for smaller screens
      if (window.innerWidth < 820) {
        this.repulsion = 2500;
        this.targetDist = 70;
      }

      this.init();
      // Start the animation loop
      this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    }

    init() {
      // Create an SVG layer for links (drawn underneath nodes)
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.position = "absolute";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.zIndex = "1";
      this.svg = svg;
      this.container.appendChild(svg);

      // Initialize node positions and DOM elements
      const { width, height } = this.container.getBoundingClientRect();
      this.nodes.forEach((node) => {
        const el = document.createElement("div");
        el.className = "skill-node";
        if (node.core) el.classList.add("core");
        el.innerText = node.id;
        el.style.zIndex = "2";
        this.container.appendChild(el);

        // Physics properties
        node.x = Math.random() * width;
        node.y = Math.random() * height;
        node.vx = 0;
        node.vy = 0;

        node.domElement = el;
        this.nodeElements.push(el);

        // Drag and drop logic
        this.addDrag(node);
      });

      // Initialize link DOM elements
      this.links.forEach(() => {
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        line.setAttribute("class", "skill-link");
        this.svg.appendChild(line);
        this.linkElements.push(line);
      });
    }

    addDrag(node) {
      const onMouseDown = (e) => {
        // e.preventDefault(); // This can prevent scrolling on touch
        if (e.type === "touchstart") e.preventDefault(); // Only prevent default for touch
        node.isDragging = true;
      };

      const onMouseUp = () => {
        node.isDragging = false;
      };

      const onMouseMove = (e) => {
        if (!node.isDragging) return;
        // Handle both mouse and touch events
        const event = e.touches ? e.touches[0] : e;
        const { left, top } = this.container.getBoundingClientRect();

        // Calculate new position
        let newX = event.clientX - left;
        let newY = event.clientY - top;

        // Clamp position to be within the container boundaries
        const { width, height } = this.container.getBoundingClientRect();
        const elHalfWidth = node.domElement.offsetWidth / 2;
        const elHalfHeight = node.domElement.offsetHeight / 2;

        node.x = Math.max(elHalfWidth, Math.min(width - elHalfWidth, newX));
        node.y = Math.max(elHalfHeight, Math.min(height - elHalfHeight, newY));

        node.vx = 0; // Stop velocity while dragging
        node.vy = 0;
      };

      // --- Bind Events ---

      // Desktop events
      node.domElement.addEventListener("mousedown", onMouseDown);

      // Mobile touch events
      // { passive: false } is crucial to allow preventDefault()
      node.domElement.addEventListener("touchstart", onMouseDown, {
        passive: false,
      });
      node.domElement.addEventListener("touchend", onMouseUp);
      node.domElement.addEventListener("touchcancel", onMouseUp);

      // Global move/end events
      // We listen on `window` to handle dragging outside the container
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("mouseleave", onMouseUp); // In case mouse leaves window
      window.addEventListener("mousemove", onMouseMove);

      // { passive: false } allows us to call preventDefault inside onMouseMove
      // which stops the page from scrolling while dragging a node on mobile
      window.addEventListener(
        "touchmove",
        (e) => {
          if (node.isDragging) {
            e.preventDefault();
            onMouseMove(e);
          }
        },
        { passive: false }
      );
    }

    animate() {
      // Apply forces
      this.nodes.forEach((nodeA) => {
        if (nodeA.isDragging) return;

        // 1. Repulsion force (from other nodes)
        this.nodes.forEach((nodeB) => {
          if (nodeA === nodeB) return;

          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 100) distSq = 100; // avoid extreme forces

          const force = this.repulsion / distSq;
          nodeA.vx += (dx / Math.sqrt(distSq)) * force;
          nodeA.vy += (dy / Math.sqrt(distSq)) * force;
        });

        // 2. Centering force (pull to center)
        const { width, height } = this.container.getBoundingClientRect();
        const centerForce = 0.01;
        nodeA.vx += (width / 2 - nodeA.x) * centerForce;
        nodeA.vy += (height / 2 - nodeA.y) * centerForce;
      });

      // 3. Spring force (from links)
      this.links.forEach((link) => {
        const nodeA = this.nodes.find((n) => n.id === link.source);
        const nodeB = this.nodes.find((n) => n.id === link.target);

        if (!nodeA || !nodeB) return; // Safety check

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (dist - this.targetDist) * this.stiffness;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!nodeA.isDragging) {
          nodeA.vx += fx;
          nodeA.vy += fy;
        }
        if (!nodeB.isDragging) {
          nodeB.vx -= fx;
          nodeB.vy -= fy;
        }
      });

      // Update positions
      this.nodes.forEach((node) => {
        if (node.isDragging) return;

        // Apply damping
        node.vx *= this.damping;
        node.vy *= this.damping;

        // Cap velocity
        const maxVel = 50;
        node.vx = Math.max(-maxVel, Math.min(maxVel, node.vx));
        node.vy = Math.max(-maxVel, Math.min(maxVel, node.vy));

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Boundary check
        const { width, height } = this.container.getBoundingClientRect();
        const elHalfWidth = node.domElement.offsetWidth / 2;
        const elHalfHeight = node.domElement.offsetHeight / 2;

        node.x = Math.max(elHalfWidth, Math.min(width - elHalfWidth, node.x));
        node.y = Math.max(
          elHalfHeight,
          Math.min(height - elHalfHeight, node.y)
        );
      });

      // Render
      this.render();

      // Continue the loop
      this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    }

    render() {
      // Update node positions
      this.nodes.forEach((node) => {
        node.domElement.style.transform = `translate(${
          node.x - node.domElement.offsetWidth / 2
        }px, ${node.y - node.domElement.offsetHeight / 2}px)`;
      });

      // Update link positions
      this.links.forEach((link, i) => {
        const nodeA = this.nodes.find((n) => n.id === link.source);
        const nodeB = this.nodes.find((n) => n.id === link.target);
        const line = this.linkElements[i];

        if (nodeA && nodeB && line) {
          line.setAttribute("x1", nodeA.x);
          line.setAttribute("y1", nodeA.y);
          line.setAttribute("x2", nodeB.x);
          line.setAttribute("y2", nodeB.y);
        }
      });
    }
  }

  // --- Initialize Skill Graph ---
  const nodes = [
    { id: "Node.js", core: true },
    { id: "JavaScript" },
    { id: "TypeScript" },
    { id: "Databases", core: true },
    { id: "PostgreSQL" },
    { id: "MongoDB" },
    { id: "Redis" },
    { id: "Infrastructure", core: true },
    { id: "Docker" },
    { id: "Kubernetes" },
    { id: "AWS" },
    { id: "Architecture", core: true },
    { id: "Microservices" }, // ✅ fixed
    { id: "Kafka" },
    { id: "gRPC" },
    { id: "Security" },
  ];

  const links = [
    { source: "Node.js", target: "JavaScript" },
    { source: "Node.js", target: "TypeScript" },
    { source: "Node.js", target: "Microservices" },
    { source: "Databases", target: "PostgreSQL" },
    { source: "Databases", target: "MongoDB" },
    { source: "Databases", target: "Redis" },
    { source: "Node.js", target: "Databases" },
    { source: "Infrastructure", target: "Docker" },
    { source: "Infrastructure", target: "Kubernetes" },
    { source: "Infrastructure", target: "AWS" },
    { source: "Microservices", target: "Infrastructure" },
    { source: "Architecture", target: "Microservices" },
    { source: "Architecture", target: "Kafka" },
    { source: "Architecture", target: "gRPC" },
    { source: "Architecture", target: "Security" },
    { source: "Node.js", target: "Architecture" },
    { source: "Kafka", target: "Microservices" },
  ];

  // Only init graph if container exists
  if (document.getElementById("skill-graph-container")) {
    new SkillGraph("skill-graph-container", nodes, links);
  }
});
