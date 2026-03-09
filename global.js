
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers (Netlify-safe: no DOMContentLoaded dependency, use raf + polling)
  // ---------------------------------------------------------------------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function mountWhenReady(fn, opts) {
    const tries = (opts && opts.tries) || 140; // ~14s
    const every = (opts && opts.every) || 100; // 100ms
    let n = 0;

    const t = setInterval(() => {
      n++;
      const ok = fn();
      if (ok || n >= tries) clearInterval(t);
    }, every);
  }

  function $1(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$ (sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  // ---------------------------------------------------------------------------
  // 1) Insert comment before <html>
  // ---------------------------------------------------------------------------
  function initBmComment() {
    if (document.documentElement.dataset.bmCommentMounted === "1") return true;
    document.documentElement.dataset.bmCommentMounted = "1";

    const html = document.documentElement;
    if (!html) return false;

    const madeBy = document.createComment(" DESIGNED AND BUILT BY BETTER MISTAKES - BETTERMISTAKES.COM ");
    document.insertBefore(madeBy, html);
    return true;
  }

  // ---------------------------------------------------------------------------
  // 2) Footer year (no Webflow.push, no jQuery)
  // ---------------------------------------------------------------------------
  function initFooterYear() {
    const els = $$(".footer-year");
    if (!els.length) return true;
    const y = String(new Date().getFullYear());
    els.forEach((el) => (el.textContent = y));
    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) Skip-to-main (click + Enter) (no jQuery)
  // ---------------------------------------------------------------------------
  function initSkipLink() {
    const link = $1("#skip-link");
    const main = $1("#main");
    if (!link || !main) return true;

    if (link.dataset.skipMounted === "1") return true;
    link.dataset.skipMounted = "1";

    function activate(e) {
      const isKey = e.type === "keydown";
      if (isKey && e.key !== "Enter") return;
      e.preventDefault();
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: false });
    }

    link.addEventListener("click", activate);
    link.addEventListener("keydown", activate);
    return true;
  }

  // ---------------------------------------------------------------------------
  // 4) Navbar dropdown icon rotate (single-open behavior + outside click closes)
  //    (keeps your original rotate-180 class + inline transform)
  // ---------------------------------------------------------------------------
  function initNavbarDropdownIconRotate() {
    const toggles = $$(".menu-dropdown");
    if (!toggles.length) return true;

    // avoid double init
    if (document.documentElement.dataset.navDropdownRotateMounted === "1") return true;
    document.documentElement.dataset.navDropdownRotateMounted = "1";

    function closeAllExcept(iconToKeep) {
      const allIcons = $$(".icon-1x1-12 svg");
      allIcons.forEach((icon) => {
        if (iconToKeep && icon === iconToKeep) return;
        if (icon.classList.contains("rotate-180")) {
          icon.classList.remove("rotate-180");
          icon.style.transition = "transform 0.3s ease";
          icon.style.transform = "rotate(0)";
        }
      });
    }

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        const parentDropdown = toggle.closest(".navbar-dropdown");
        if (!parentDropdown) return;

        const parentIcon = parentDropdown.querySelector(".icon-1x1-12 svg");

        // close others
        closeAllExcept(parentIcon);

        // toggle this one
        if (parentIcon) {
          parentIcon.classList.toggle("rotate-180");
          // keep the setTimeout(0) behavior
          setTimeout(() => {
            parentIcon.style.transition = "transform 0.3s ease";
            parentIcon.style.transform = parentIcon.classList.contains("rotate-180")
              ? "rotate(180deg)"
              : "rotate(0)";
          }, 0);
        }
      });
    });

    // click outside -> close
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".navbar-dropdown")) {
        closeAllExcept(null);
      }
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5) Banner spacing + banner show/hide state + close persistence (deduped)
  //    - Updates .banner-spacing height = .navbar_banner height
  //    - Hides .banner-spacing if banner is display:none
  //    - Close banner on click for 60s via localStorage
  // ---------------------------------------------------------------------------
  function initBannerSystem() {
    const banner = $1(".navbar_banner");
    const spacers = $$(".banner-spacing");

    // If no banner AND no spacers, nothing to do
    if (!banner && !spacers.length) return true;

    if (document.documentElement.dataset.bannerSystemMounted === "1") return true;
    document.documentElement.dataset.bannerSystemMounted = "1";

    const KEY = "navbar_banner_ferme";
    const TTL_MS = 60000;

    function setSpacerHeight() {
      if (!spacers.length) return;
      if (!banner) {
        spacers.forEach((s) => (s.style.height = "0px"));
        return;
      }
      const h = banner.offsetHeight || 0;
      spacers.forEach((s) => (s.style.height = h + "px"));
    }

    function syncSpacerVisibility() {
      if (!spacers.length) return;
      if (!banner) {
        spacers.forEach((s) => (s.style.display = "none"));
        return;
      }
      const isHidden = getComputedStyle(banner).display === "none";
      spacers.forEach((s) => (s.style.display = isHidden ? "none" : "block"));
    }

    function setBannerVisible(visible) {
      if (!banner) return;
      banner.style.display = visible ? "block" : "none";
      syncSpacerVisibility();
      setSpacerHeight();
    }

    function verifyBannerState() {
      if (!banner) return;
      const closed = localStorage.getItem(KEY) === "true";
      if (closed) {
        setBannerVisible(false);
      } else {
        // your "conditions" hook:
        const shouldShow = true;
        setBannerVisible(!!shouldShow);
      }
    }

    function closeBanner() {
      if (!banner) return;
      setBannerVisible(false);
      localStorage.setItem(KEY, "true");

      // auto-release after TTL
      setTimeout(() => {
        localStorage.removeItem(KEY);
        verifyBannerState();
      }, TTL_MS);
    }

    // Close on click (as in your original)
    if (banner) {
      banner.addEventListener("click", closeBanner);
    }

    // Initial + resize
    verifyBannerState();
    setSpacerHeight();
    syncSpacerVisibility();

    window.addEventListener("resize", () => {
      setSpacerHeight();
      syncSpacerVisibility();
    }, { passive: true });

    // safety re-check after TTL (your original does this too)
    setTimeout(() => {
      localStorage.removeItem(KEY);
      verifyBannerState();
    }, TTL_MS);

    return true;
  }

  // ---------------------------------------------------------------------------
  // 6) Mobile menu scroll lock based on opacity of MENU_SEL
  //    (kept logic, removed DOMContentLoaded dependency)
  // ---------------------------------------------------------------------------
  function initOpacityMenuScrollLock() {
    const MENU_SEL = "._01-01-02-menu-links.is-new";
    const mm = window.matchMedia("(max-width: 991.98px)");
    let lockedY = 0;

    function getOpacity() {
      const el = $1(MENU_SEL);
      if (!el) return 0;
      const op = parseFloat(getComputedStyle(el).opacity || "0") || 0;
      if (op <= 0.01) return 0;
      if (op >= 0.99) return 1;
      return op;
    }

    function lockScroll() {
      if (document.body.dataset.scrollLocked === "1") return;
      lockedY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.dataset.scrollLocked = "1";
      document.body.style.position = "fixed";
      document.body.style.top = `-${lockedY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    }

    function unlockScroll() {
      if (document.body.dataset.scrollLocked !== "1") return;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.dataset.scrollLocked = "";
      window.scrollTo(0, lockedY || 0);
    }

    function sync() {
      if (!mm.matches) { unlockScroll(); return; }
      const op = getOpacity();
      if (op === 1) lockScroll();
      else if (op === 0) unlockScroll();
    }

    function attachObserver() {
      const el = $1(MENU_SEL);
      if (!el) return false;

      if (el.dataset.opacityLockMounted === "1") return true;
      el.dataset.opacityLockMounted = "1";

      const mo = new MutationObserver(() => setTimeout(sync, 0));
      mo.observe(el, { attributes: true, attributeFilter: ["style", "class"] });

      el.addEventListener("transitionend", (e) => {
        if (e.propertyName === "opacity") setTimeout(sync, 0);
      });

      return true;
    }

    // Re-sync on typical interactions
    document.addEventListener("click", (e) => {
      if (e.target.closest(".hamburger-wrapper-grey, .hamburger-menu-wrapper, " + MENU_SEL + " a")) {
        setTimeout(sync, 60);
      }
    }, true);

    mm.addEventListener("change", () => setTimeout(sync, 50));
    window.addEventListener("resize", () => setTimeout(sync, 50));
    window.addEventListener("orientationchange", () => setTimeout(sync, 150));

    // Attach when menu exists
    mountWhenReady(() => {
      const ok = attachObserver();
      if (ok) sync();
      return ok;
    }, { tries: 120, every: 100 });

    return true;
  }

   // ---------------------------------------------------------------------------
  // 7) Scrolling Banner
  // ------
const scrollSpeed = 50;
function startScrolling(element) {
  const scrollWidth = element.offsetWidth;
  let startTime = null;
  function animate(time) {
    if (!startTime) startTime = time;
    const timeElapsed = time - startTime;
    const scrollPosition = (timeElapsed * scrollSpeed / 1000) % scrollWidth;
    element.style.transform = `translateX(${-scrollPosition}px)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll(".is--scrolling").forEach(startScrolling);
});


  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  raf2(() => {
    initBmComment();
    initFooterYear();
    initSkipLink();
    initNavbarDropdownIconRotate();
    initBannerSystem();
    initOpacityMenuScrollLock();
  });

})();


