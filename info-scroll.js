(() => {
  const root = document.documentElement;
  const links = document.querySelectorAll("[data-info-scroll]");
  const work = document.getElementById("work");
  const information = document.getElementById("information");
  if (!links.length || !work || !information) {
    window.kspfMarkHomeReady?.("position");
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let animationFrame = 0;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const targetFor = (name) => (name === "information" ? information : work);
  const topFor = (target) => target.getBoundingClientRect().top + window.scrollY;

  const finish = (target, markReady) => {
    if (markReady) window.kspfMarkHomeReady?.("position");
    if (target === work) {
      root.classList.remove("is-info-scrolling");
    }
    target.focus({ preventScroll: true });
  };

  const scrollToTarget = (target, animate = true, markReady = false) => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    root.classList.add("is-info-scrolling");

    const start = window.scrollY;
    const end = topFor(target);
    const distance = end - start;
    const duration = animate && !reduceMotion ? 900 : 0;

    if (!duration || Math.abs(distance) < 1) {
      window.scrollTo(0, end);
      finish(target, markReady);
      return;
    }

    const startedAt = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start + distance * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
        return;
      }

      animationFrame = 0;
      finish(target, markReady);
    };

    animationFrame = requestAnimationFrame(step);
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const name = link.dataset.infoScroll;
      const target = targetFor(name);
      history.pushState({ homeSection: name }, "", link.getAttribute("href"));
      scrollToTarget(target);
    });
  });

  window.addEventListener("popstate", () => {
    scrollToTarget(targetFor(location.hash === "#information" ? "information" : "work"));
  });

  const setInitialPosition = () => {
    const target = location.hash === "#information" ? information : work;
    scrollToTarget(target, false, true);
  };

  window.addEventListener("kspf:content-ready", setInitialPosition, { once: true });
  requestAnimationFrame(() => {
    const target = location.hash === "#information" ? information : work;
    scrollToTarget(target, false);
    if (
      window.kspfHomeReady?.site &&
      window.kspfHomeReady?.home &&
      window.kspfHomeReady?.projects
    ) {
      setInitialPosition();
    }
  });
})();
