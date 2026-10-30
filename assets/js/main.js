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

  // Post grid tab: clicking a project card opens its detail panel below the grid
  document.querySelectorAll("[data-post-grid]").forEach((grid) => {
    const cards = grid.querySelectorAll(".post-card");
    const close = () => {
      cards.forEach((c) => {
        c.classList.remove("is-active");
        c.setAttribute("aria-expanded", "false");
        document.getElementById(c.getAttribute("aria-controls")).hidden = true;
      });
    };
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        if (card.classList.contains("is-active")) return close();
        close();
        card.classList.add("is-active");
        card.setAttribute("aria-expanded", "true");
        const panel = document.getElementById(card.getAttribute("aria-controls"));
        panel.hidden = false;
        panel.classList.remove("is-entering");
        void panel.offsetWidth; // restart the entrance animation
        panel.classList.add("is-entering");
      });
    });
    grid.querySelectorAll(".post-detail__close").forEach((btn) => btn.addEventListener("click", close));
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

  // Lunch meeting pop-up: opened from the header triangle badge on every page.
  // Built here so the markup lives in one place; it must exist before the
  // date-picker and validation hooks below run.
  const lunchOpeners = document.querySelectorAll("[data-lunch-open]");
  if (lunchOpeners.length) {
    const modal = document.createElement("dialog");
    modal.className = "lunch-modal";
    modal.setAttribute("aria-labelledby", "lunchModalTitle");
    modal.innerHTML = `
      <div class="contact-card contact-card--lunch">
        <button type="button" class="lunch-modal__close" aria-label="Close" data-lunch-close><span aria-hidden="true">&times;</span></button>
        <div class="contact-card__head">
          <h2 id="lunchModalTitle">Lunch Meeting Request</h2>
          <p>Robin Weck is offering a 60-minute lunchtime discussion (see topics) to firms utilizing Commercial Appraisal Services. Select an available date on the calendar and we will confirm the date and time you have selected.</p>
        </div>
        <form class="contact-form js-validate" novalidate>
          <div class="field-row">
            <div class="field">
              <label for="lm-name">Full Name</label>
              <input type="text" id="lm-name" name="name" placeholder="Thomas Benton" autocomplete="name" required>
            </div>
            <div class="field">
              <label for="lm-company">Company</label>
              <input type="text" id="lm-company" name="company" placeholder="Benton &amp; Associates LLP" autocomplete="organization" required>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="lm-email">Email Address</label>
              <input type="email" id="lm-email" name="email" placeholder="t.benton@example.com" autocomplete="email" required>
            </div>
            <div class="field">
              <label for="lm-phone">Phone Number</label>
              <input type="tel" id="lm-phone" name="phone" placeholder="(916) 555-0140" autocomplete="tel" required>
            </div>
          </div>
          <div class="field">
            <label for="lm-topic">Discussion Topics</label>
            <select id="lm-topic" name="topic" required>
              <option value="" selected disabled>Select a topic</option>
              <option>USPAP</option>
              <option>Not So Common Errors and Mistakes</option>
              <option>Artificial Intelligence</option>
            </select>
          </div>
          <div class="field">
            <label for="lm-date">Preferred Date</label>
            <div class="date-picker">
              <input type="date" id="lm-date" name="date" required data-weekday-date>
              <button type="button" class="date-picker__btn" data-open-picker="lm-date">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm12 8H5v9h14v-9ZM5 6v2h14V6H5Zm2 6h3v3H7v-3Z"/></svg>
                Calendar
              </button>
            </div>
          </div>
          <button type="submit" class="btn-dark">Request Lunch Meeting</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    document.body.appendChild(modal);

    lunchOpeners.forEach((btn) => btn.addEventListener("click", () => {
      setNav(false);
      modal.showModal();
    }));
    modal.querySelector("[data-lunch-close]").addEventListener("click", () => modal.close());
    // Clicking the dimmed backdrop (the dialog itself, outside the card) closes it
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
  }

  // Lunch meeting date: weekdays from tomorrow on; the Calendar button opens the native picker
  document.querySelectorAll("input[data-weekday-date]").forEach((input) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n) => String(n).padStart(2, "0");
    input.min = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    input.addEventListener("input", () => {
      const day = input.value ? new Date(input.value + "T12:00").getDay() : 1;
      input.setCustomValidity(day === 0 || day === 6 ? "Please choose a weekday." : "");
    });
  });
  document.querySelectorAll("[data-open-picker]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.openPicker);
      input.focus();
      if (typeof input.showPicker === "function") input.showPicker();
    });
  });

  // Quote + lunch meeting forms: client-side validation only (no backend wired up yet)
  document.querySelectorAll("form.js-validate").forEach((form) => {
    const status = form.querySelector(".form-status");
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
  });

  // Book a consultant: 3-step request (details -> date & time -> confirm).
  // Availability is generated client-side (weekdays, tomorrow onward, ~60 days)
  // until a booking backend is wired up.
  const booking = document.getElementById("bookingForm");
  if (booking) {
    const card = booking.closest(".booking");
    const panels = card.querySelectorAll("[data-step]");
    const pills = card.querySelectorAll("[data-step-pill]");
    const grid = card.querySelector("[data-cal-grid]");
    const calLabel = card.querySelector("[data-cal-label]");
    const prevBtn = card.querySelector("[data-cal-prev]");
    const nextBtn = card.querySelector("[data-cal-next]");
    const slotList = card.querySelector("[data-slot-list]");
    const slotsHead = card.querySelector("[data-slots-head]");
    const SLOT_HOURS = [8, 9, 10, 11, 13, 14, 15, 16];
    const DURATION = 60;

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(new Date());
    const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 59);
    const isOpen = (d) => d >= minDate && d <= maxDate && d.getDay() !== 0 && d.getDay() !== 6;
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hourLabel = (h) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
    const escapeHtml = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

    let view = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const selected = { date: null, hour: null };

    const value = (name) => (booking.elements[name] ? booking.elements[name].value.trim() : "");
    const setError = (step, message) => {
      const box = card.querySelector(`[data-error="${step}"]`);
      box.textContent = message || "";
      box.hidden = !message;
    };

    const show = (step) => {
      panels.forEach((p) => p.classList.toggle("is-active", Number(p.dataset.step) === step));
      pills.forEach((pill) => {
        const n = Number(pill.dataset.stepPill);
        pill.classList.toggle("is-active", n === step);
        pill.classList.toggle("is-done", n < step);
      });
      const top = card.getBoundingClientRect().top + window.scrollY - 120;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
    };

    const paintMonth = () => {
      const year = view.getFullYear();
      const month = view.getMonth();
      calLabel.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      prevBtn.disabled = view <= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      nextBtn.disabled = new Date(year, month + 1, 1) > maxDate;

      let html = "";
      for (let i = 0; i < view.getDay(); i++) html += '<span class="cal-day is-blank" aria-hidden="true"></span>';
      const total = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= total; day++) {
        const d = new Date(year, month, day);
        const open = isOpen(d);
        const isSel = selected.date && iso(selected.date) === iso(d);
        html += `<button type="button" class="cal-day${open ? " is-open" : ""}${isSel ? " is-selected" : ""}" data-date="${iso(d)}"${open ? "" : " disabled"} aria-label="${d.toDateString()}${open ? "" : ", unavailable"}">${day}</button>`;
      }
      grid.innerHTML = html;
    };

    const pickDate = (d) => {
      selected.date = d;
      selected.hour = null;
      grid.querySelectorAll(".cal-day").forEach((b) => b.classList.toggle("is-selected", b.dataset.date === iso(d)));
      slotsHead.textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      slotList.innerHTML = SLOT_HOURS.map((h) => `<button type="button" class="slot" data-hour="${h}">${hourLabel(h)}</button>`).join("");
    };

    const validateDetails = () => {
      const checks = [
        ["full_name", "Enter your full name."],
        ["email", "Enter a valid email address."],
        ["phone", "Enter a phone number we can reach you on."],
        ["service_type", "Choose a service type."],
      ];
      for (const [name, message] of checks) {
        const el = booking.elements[name];
        const bad = !el.value.trim() || (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()));
        el.closest(".field").classList.toggle("has-error", bad);
        if (bad) {
          setError(1, message);
          el.focus();
          return false;
        }
      }
      setError(1, "");
      return true;
    };

    const renderReview = () => {
      const rows = [
        ["Date", slotsHead.textContent],
        ["Time", `${hourLabel(selected.hour)} (${DURATION} minutes)`],
        ["Format", value("meeting_type")],
        ["Service", value("service_type")],
        ["Name", value("full_name")],
        ["Email", value("email")],
        ["Phone", value("phone")],
        ["Firm", value("company")],
        ["Property", value("property_address")],
        ["Notes", value("message")],
      ];
      card.querySelector("[data-review]").innerHTML = rows
        .filter((r) => r[1])
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`)
        .join("");
    };

    card.addEventListener("click", (e) => {
      const next = e.target.closest("[data-next]");
      const back = e.target.closest("[data-back]");
      const day = e.target.closest(".cal-day.is-open");
      const slot = e.target.closest(".slot");

      if (next && next.dataset.next === "2") {
        if (validateDetails()) show(2);
      } else if (next && next.dataset.next === "3") {
        if (!selected.date || selected.hour === null) return setError(2, "Choose a date and a time to continue.");
        setError(2, "");
        renderReview();
        show(3);
      } else if (back) {
        show(Number(back.dataset.back));
      } else if (e.target.closest("[data-cal-prev]") || e.target.closest("[data-cal-next]")) {
        view = new Date(view.getFullYear(), view.getMonth() + (e.target.closest("[data-cal-prev]") ? -1 : 1), 1);
        paintMonth();
      } else if (day) {
        const [y, m, d] = day.dataset.date.split("-").map(Number);
        pickDate(new Date(y, m - 1, d));
      } else if (slot) {
        selected.hour = Number(slot.dataset.hour);
        slotList.querySelectorAll(".slot").forEach((s) => s.classList.toggle("is-selected", s === slot));
        setError(2, "");
      }
    });

    booking.addEventListener("submit", (e) => {
      e.preventDefault();
      // Enter in an earlier step triggers implicit submission; only step 3 sends
      if (card.querySelector(".booking-panel.is-active").dataset.step !== "3") return;
      if (!booking.elements.consent.checked) {
        return setError(3, "Tick the box to confirm you understand how the appointment is confirmed.");
      }
      setError(3, "");
      card.querySelector("[data-done-ref]").textContent = `${slotsHead.textContent} at ${hourLabel(selected.hour)}`;
      pills.forEach((pill) => {
        pill.classList.remove("is-active");
        pill.classList.add("is-done");
      });
      panels.forEach((p) => p.classList.toggle("is-active", p.dataset.step === "4"));
    });

    booking.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });

    paintMonth();
  }
});
