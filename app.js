/* ---
   APP.JS
   This file contains all "highly advanced" logic.
   It is modular, with separate classes/functions for each feature
   to keep it clean and readable.

   FEATURES:
   1. TextScrambleEffect: A class to handle the "decoding" text animation.
   2. TiltEffect: A function for the 3D project card hover effect.
   3. SkillGraph: A class for the complex, interactive node map.
--- */

document.addEventListener("DOMContentLoaded", () => {
  // --- FEATURE 1: TEXT SCRAMBLE ---

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
    const originalText = el.innerText;
    el.addEventListener("mouseover", () => {
      scrambler.setText(originalText);
    });
    // Scramble on load for hero title
    if (el.classList.contains("hero-title")) {
      scrambler.setText(originalText);
    }
  });

  // --- FEATURE 2: 3D TILT EFFECT ---

  /**
   * Attaches the 3D tilt effect to all elements with [data-tilt="true"]
   * This is a "vanilla JS" implementation of a popular tilt effect.
   */
  const tiltElements = document.querySelectorAll('[data-tilt="true"]');
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

  // --- FEATURE 3: SKILL GRAPH ---

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

      this.init();
      this.animate();
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
        e.preventDefault();
        node.isDragging = true;
      };

      const onMouseUp = () => {
        node.isDragging = false;
      };

      const onMouseMove = (e) => {
        if (!node.isDragging) return;
        const { left, top } = this.container.getBoundingClientRect();
        node.x = e.clientX - left;
        node.y = e.clientY - top;
        node.vx = 0; // Stop velocity while dragging
        node.vy = 0;
      };

      node.domElement.addEventListener("mousedown", onMouseDown);
      this.container.addEventListener("mouseup", onMouseUp);
      this.container.addEventListener("mouseleave", onMouseUp);
      this.container.addEventListener("mousemove", onMouseMove);
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
          const distSq = dx * dx + dy * dy;
          if (distSq < 1) distSq = 1; // avoid division by zero

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

      requestAnimationFrame(this.animate.bind(this));
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

        line.setAttribute("x1", nodeA.x);
        line.setAttribute("y1", nodeA.y);
        line.setAttribute("x2", nodeB.x);
        line.setAttribute("y2", nodeB.y);
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
    { id: "Microservices" },
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

  new SkillGraph("skill-graph-container", nodes, links);
});
