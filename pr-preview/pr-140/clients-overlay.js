(() => {
  const configs = [
    {
      name: "clients",
      overlayId: "clientsOverlay",
      toggleSelector: ".js-clients-toggle",
      closeSelector: ".js-clients-close",
      bodyClass: "clients-open",
      cssLeftVar: "--clients-toggle-left",
      cssRightVar: "--clients-toggle-right",
    },
    {
      name: "information",
      overlayId: "informationOverlay",
      toggleSelector: ".js-information-toggle",
      closeSelector: ".js-information-close",
      bodyClass: "information-open",
      cssLeftVar: "--information-toggle-left",
      cssCloseLeftVar: "--information-close-left",
    },
  ];

  const overlays = configs
    .map((config) => {
      const overlay = document.getElementById(config.overlayId);
      if (!overlay) return null;
      return {
        ...config,
        overlay,
        toggles: document.querySelectorAll(config.toggleSelector),
        closeBtn: document.querySelector(config.closeSelector),
      };
    })
    .filter(Boolean);

  if (!overlays.length) return;

  let lastActive = null;

  const isOpen = (config) => config.overlay.classList.contains("is-open");

  const updateToggleLeftVar = (config) => {
    if (!config.cssLeftVar) return;
    const firstToggle = config.toggles && config.toggles[0];
    if (!firstToggle) return;
    const { left, right } = firstToggle.getBoundingClientRect();
    document.documentElement.style.setProperty(config.cssLeftVar, `${Math.round(left)}px`);
    if (config.cssRightVar) {
      document.documentElement.style.setProperty(config.cssRightVar, `${Math.round(right)}px`);
    }
    if (config.cssCloseLeftVar && config.closeBtn) {
      const { left: closeLeft } = config.closeBtn.getBoundingClientRect();
      document.documentElement.style.setProperty(config.cssCloseLeftVar, `${Math.round(closeLeft)}px`);
    }
  };

  const updateAllToggleLeftVars = () => {
    overlays.forEach(updateToggleLeftVar);
  };

  const updateHeaderHeight = () => {
    const header = document.querySelector(".top");
    if (!header) return;
    const { height } = header.getBoundingClientRect();
    document.documentElement.style.setProperty("--header-height", `${Math.round(height)}px`);
  };

  const setOpen = (config, open, restoreFocus = true) => {
    config.overlay.classList.toggle("is-open", open);
    config.overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle(config.bodyClass, open);

    config.toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    requestAnimationFrame(() => {
      updateAllToggleLeftVars();
      updateHeaderHeight();
    });

    if (open) {
      lastActive = document.activeElement;
      if (config.closeBtn) {
        config.closeBtn.disabled = false;
        requestAnimationFrame(() => config.closeBtn.focus());
      }
    } else if (restoreFocus && lastActive && typeof lastActive.focus === "function") {
      if (config.closeBtn) config.closeBtn.disabled = true;
      lastActive.focus();
    } else if (config.closeBtn) {
      config.closeBtn.disabled = true;
    }
  };

  const closeOthers = (activeConfig) => {
    overlays.forEach((config) => {
      if (config !== activeConfig && isOpen(config)) {
        setOpen(config, false, false);
      }
    });
  };

  overlays.forEach((config) => {
    if (config.closeBtn) config.closeBtn.disabled = true;

    config.toggles.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const nextOpen = !isOpen(config);
        if (nextOpen) closeOthers(config);
        setOpen(config, nextOpen);
      });
    });

    if (config.closeBtn) {
      config.closeBtn.addEventListener("click", () => setOpen(config, false));
    }

    config.overlay.addEventListener("click", (event) => {
      if (event.target === config.overlay) setOpen(config, false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    overlays.forEach((config) => {
      if (isOpen(config)) setOpen(config, false);
    });
  });

  updateAllToggleLeftVars();
  updateHeaderHeight();
  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      updateAllToggleLeftVars();
      updateHeaderHeight();
    });
  });

  if ("ResizeObserver" in window) {
    const header = document.querySelector(".top");
    if (header) {
      const observer = new ResizeObserver(() => updateHeaderHeight());
      observer.observe(header);
    }
  }

})();
