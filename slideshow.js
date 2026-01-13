(() => {
  const parseSlides = (raw) => {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const preload = (src) => {
    if (!src) return;
    const img = new Image();
    img.src = src;
  };

  const initSlideshow = (root, slides) => {
    const img = root.querySelector(".hero__img");
    const prev = root.querySelector(".hero__hit--prev");
    const next = root.querySelector(".hero__hit--next");
    if (!img || !prev || !next) return;

    if (slides.length <= 1) {
      root.classList.add("is-single");
      return;
    }

    const initialSrc = img.getAttribute("src");
    let index = slides.indexOf(initialSrc);
    if (index < 0) index = 0;

    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      img.src = slides[index];
      preload(slides[(index + 1) % slides.length]);
      preload(slides[(index - 1 + slides.length) % slides.length]);
    };

    prev.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => show(index + 1));

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        show(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        show(index + 1);
      }
    });

    preload(slides[(index + 1) % slides.length]);
  };

  const isStringArray = (value) =>
    Array.isArray(value) && value.every((item) => typeof item === "string");

  const loadSlidesFromJson = async (src) => {
    const res = await fetch(src, { cache: "no-cache" });
    if (!res.ok) return [];
    const data = await res.json();
    return isStringArray(data) ? data : [];
  };

  document.querySelectorAll(".js-slideshow").forEach((root) => {
    const slidesSrc = root.dataset.slidesSrc;
    if (slidesSrc) {
      loadSlidesFromJson(slidesSrc)
        .then((slides) => initSlideshow(root, slides.filter(Boolean)))
        .catch(() => initSlideshow(root, parseSlides(root.dataset.slides).filter(Boolean)));
      return;
    }

    initSlideshow(root, parseSlides(root.dataset.slides).filter(Boolean));
  });
})();
