(() => {
  const configs = [
    {
      name: "clients",
      overlayId: "clientsOverlay",
      toggleSelector: ".js-clients-toggle",
      closeSelector: ".js-clients-close",
      bodyClass: "clients-open",
    },
    {
      name: "info",
      overlayId: "infoOverlay",
      toggleSelector: ".js-info-toggle",
      closeSelector: ".js-info-close",
      bodyClass: "info-open",
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

  const setOpen = (config, open, restoreFocus = true) => {
    config.overlay.classList.toggle("is-open", open);
    config.overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle(config.bodyClass, open);

    config.toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (open) {
      lastActive = document.activeElement;
      if (config.closeBtn) config.closeBtn.focus();
    } else if (restoreFocus && lastActive && typeof lastActive.focus === "function") {
      lastActive.focus();
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

})();
