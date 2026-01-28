(() => {
  const container = document.getElementById("projects");
  if (!container) return;

  const isVideoSrc = (src) => /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src || "");
  const normalizeViewUrl = (url) => {
    if (!url) return "";
    if (/^(https?:)?\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  const formatViewLabel = (url) => {
    if (!url) return "visit site";
    try {
      const normalized = normalizeViewUrl(url);
      const { hostname } = new URL(normalized);
      return hostname.replace(/^www\./i, "");
    } catch {
      return url;
    }
  };

  const createHero = (project, index) => {
    const figure = document.createElement("figure");
    figure.className = "hero js-slideshow";
    figure.tabIndex = 0;
    figure.dataset.slides = JSON.stringify(project.slides || []);

    const prev = document.createElement("button");
    prev.className = "hero__hit hero__hit--prev";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous image");

    const next = document.createElement("button");
    next.className = "hero__hit hero__hit--next";
    next.type = "button";
    next.setAttribute("aria-label", "Next image");

    const img = document.createElement("img");
    img.className = "hero__media hero__img";
    const slides = project.slides || [];
    const firstImage = slides.find((src) => src && !isVideoSrc(src)) || "";
    img.src = firstImage || slides[0] || "";
    img.alt = project.alt || project.title || "Project image";
    img.loading = index === 0 ? "eager" : "lazy";

    const video = document.createElement("video");
    video.className = "hero__media hero__video";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    const firstSlide = slides[0] || "";
    const startsWithVideo = isVideoSrc(firstSlide);
    if (startsWithVideo) {
      video.src = firstSlide;
    }
    img.classList.toggle("is-hidden", startsWithVideo);
    video.classList.toggle("is-hidden", !startsWithVideo);

    figure.append(prev, next, img, video);
    return figure;
  };

  const createProjectText = (project) => {
    const section = document.createElement("section");
    section.className = "project";
    if (project.viewUrl) {
      const view = document.createElement("a");
      view.className = "project__view";
      view.href = normalizeViewUrl(project.viewUrl);
      view.target = "_blank";
      view.rel = "noopener";
      view.textContent = formatViewLabel(project.viewUrl);
      section.appendChild(view);
    }
    const p = document.createElement("p");
    p.className = "project__text";
    p.textContent = project.description || "";
    section.appendChild(p);
    return section;
  };

  const renderProjects = (projects) => {
    container.innerHTML = "";
    projects.forEach((project, index) => {
      const block = document.createElement("section");
      block.className = "project-block";
      block.append(createHero(project, index), createProjectText(project));
      container.appendChild(block);
    });

    if (typeof window.initSlideshows === "function") {
      window.initSlideshows();
    }
  };

  fetch("projects.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : []))
    .then((projects) => {
      if (Array.isArray(projects)) renderProjects(projects);
    })
    .catch(() => {
      container.textContent = "Projects failed to load.";
    });
})();
