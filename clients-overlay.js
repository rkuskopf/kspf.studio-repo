(() => {
  const overlay = document.getElementById("clientsOverlay");
  if (!overlay) return;

  const toggles = document.querySelectorAll(".js-clients-toggle");
  const closeBtn = document.querySelector(".js-clients-close");
  let lastActive = null;

  const isOpen = () => overlay.classList.contains("is-open");

  const setOpen = (open) => {
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("clients-open", open);

    toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (open) {
      lastActive = document.activeElement;
      if (closeBtn) closeBtn.focus();
    } else if (lastActive && typeof lastActive.focus === "function") {
      lastActive.focus();
    }
  };

  toggles.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(!isOpen());
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => setOpen(false));
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) setOpen(false);
  });
})();
