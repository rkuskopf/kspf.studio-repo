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

  const updateOverlayAnchors = () => {
    const infoToggle = document.querySelector(".js-info-toggle");
    const clientsToggle = document.querySelector(".js-clients-toggle");
    const infoOverlay = document.getElementById("infoOverlay");
    const clientsOverlay = document.getElementById("clientsOverlay");

    if (infoToggle && infoOverlay) {
      const overlayRect = infoOverlay.getBoundingClientRect();
      const paddingLeft = parseFloat(getComputedStyle(infoOverlay).paddingLeft) || 0;
      const left = Math.max(
        0,
        Math.round(infoToggle.getBoundingClientRect().left - overlayRect.left - paddingLeft)
      );
      infoOverlay.style.setProperty("--info-anchor", `${left}px`);
      infoOverlay
        .querySelectorAll(
          ".info-overlay__location, .info-overlay__contact, .info-overlay__services"
        )
        .forEach((node) => {
          node.style.marginLeft = `${left}px`;
        });
    }

    if (clientsToggle && clientsOverlay) {
      const overlayRect = clientsOverlay.getBoundingClientRect();
      const paddingLeft = parseFloat(getComputedStyle(clientsOverlay).paddingLeft) || 0;
      const left = Math.max(
        0,
        Math.round(clientsToggle.getBoundingClientRect().left - overlayRect.left - paddingLeft)
      );
      clientsOverlay.style.setProperty("--clients-anchor", `${left}px`);
      const list = clientsOverlay.querySelector(".clients-overlay__list");
      if (list) list.style.marginLeft = `${left}px`;
    }
  };

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
        if (nextOpen) updateOverlayAnchors();
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

  window.updateOverlayAnchors = updateOverlayAnchors;
  updateOverlayAnchors();
  window.addEventListener("resize", updateOverlayAnchors);
  window.addEventListener("load", updateOverlayAnchors);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateOverlayAnchors);
  }
})();
