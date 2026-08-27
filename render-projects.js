(() => {
  const contentUrl =
    typeof window.kspfContentUrl === "function" ? window.kspfContentUrl : (path) => path;
  const container = document.getElementById("projects");
  if (!container) return;

  const isVideoSrc = (src) => /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src || "");
  const isVisibleOnHome = (project) => project && project.showOnHome !== false;

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

  const createProjectMeta = (className, text) => {
    const meta = document.createElement("p");
    meta.className = className;
    meta.textContent = text || "";
    return meta;
  };

  const renderProjects = (projects) => {
    container.innerHTML = "";
    const visibleProjects = projects.filter(isVisibleOnHome);
    if (!visibleProjects.length) {
      container.textContent = "Projects not found.";
      return;
    }

    visibleProjects.forEach((project, index) => {
      const block = document.createElement("section");
      block.className = "project-block";
      block.append(
        createProjectMeta("project__name", project.displayName || project.title),
        createHero(project, index),
        createProjectMeta("project__category", project.category)
      );
      container.appendChild(block);
    });

    if (typeof window.initSlideshows === "function") {
      window.initSlideshows();
    }
  };

  fetch(contentUrl("projects.json"), { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error("Projects request failed");
      return res.json();
    })
    .then((data) => {
      const projects = Array.isArray(data)
        ? data
        : Array.isArray(data && data.projects)
          ? data.projects
          : [];
      if (projects.length) {
        renderProjects(projects);
        return;
      }
      container.textContent = "Projects not found.";
    })
    .catch(() => {
      container.textContent = "Projects failed to load.";
    });
})();
