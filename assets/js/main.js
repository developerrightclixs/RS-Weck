document.addEventListener("DOMContentLoaded", () => {
  // AOS scroll animations
  if (window.AOS) {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: true,
      offset: 80,
    });
  }

  // Header shadow once the page scrolls
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile navigation
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  const setNav = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setNav(false)));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setNav(false);
  });

  // Accordions: one item open at a time; clicking the open item closes it
  document.querySelectorAll("[data-accordion]").forEach((accordion) => {
    const items = accordion.querySelectorAll(".acc-item");
    items.forEach((item) => {
      const head = item.querySelector(".acc-head");
      head.addEventListener("click", () => {
        const wasOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          other.classList.remove("is-open");
          other.querySelector(".acc-head").setAttribute("aria-expanded", "false");
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          head.setAttribute("aria-expanded", "true");
        }
      });
    });
  });

  // Property type expertise tabs
  const tabs = document.querySelectorAll(".expertise-tab");
  const practiceText = document.getElementById("practiceText");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("is-active")) return;
      tabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      practiceText.classList.add("is-changing");
      setTimeout(() => {
        practiceText.textContent = tab.dataset.text;
        practiceText.classList.remove("is-changing");
      }, 250);
    });
  });

  // About us experience tabs (Professional / Local / Prior)
  const expTabs = document.querySelectorAll(".exp-tab");
  expTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("is-active")) return;
      expTabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
        document.getElementById(t.dataset.panel).hidden = true;
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      const panel = document.getElementById(tab.dataset.panel);
      panel.hidden = false;
      panel.classList.remove("is-entering");
      void panel.offsetWidth; // restart the entrance animation
      panel.classList.add("is-entering");
    });
  });

  // Stat counters count up the first time they scroll into view
  const counters = document.querySelectorAll(".stat__value[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const render = (el, n) => {
      const value = el.dataset.format === "comma" ? n.toLocaleString("en-US") : n;
      el.textContent = value + (el.dataset.suffix || "");
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.count);
        const start = performance.now();
        const step = (now) => {
          const t = Math.min((now - start) / 1600, 1);
          render(el, Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => observer.observe(el));
  }

  // Consultation form: client-side validation only (no backend wired up yet)
  const form = document.getElementById("contactForm");
  if (form) {
    const status = document.getElementById("formStatus");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let firstInvalid = null;
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        const invalid = !field.checkValidity();
        field.closest(".field").classList.toggle("has-error", invalid);
        if (invalid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        status.textContent = "Please complete the highlighted fields.";
        status.classList.add("is-error");
        firstInvalid.focus();
        return;
      }

      status.classList.remove("is-error");
      status.textContent = "Thank you — your request has been received. We will be in touch shortly.";
      form.reset();
    });
    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field && e.target.checkValidity()) field.classList.remove("has-error");
    });
  }
});
