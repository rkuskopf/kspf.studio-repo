(() => {
  const introEl = document.querySelector(".js-home-intro");
  const metaDescription = document.querySelector('meta[name="description"]');

  if (!introEl && !metaDescription) return;

  const setText = (el, value) => {
    if (!el || value === undefined || value === null) return;
    el.textContent = value;
  };

  fetch("content/home.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.title) document.title = data.title;
      if (data.metaDescription && metaDescription) {
        metaDescription.setAttribute("content", data.metaDescription);
      }
      if (data.intro && introEl) {
        setText(introEl, data.intro);
        introEl.title = data.intro;
      }
    })
    .catch(() => {});
})();
