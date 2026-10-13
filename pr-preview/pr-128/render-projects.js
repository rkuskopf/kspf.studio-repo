(() => {
  const contentUrl =
    typeof window.kspfContentUrl === "function" ? window.kspfContentUrl : (path) => path;
  const container = document.getElementById("projects");
  if (!container) {
    window.kspfMarkHomeReady?.("projects");
    return;
  }

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
    img.className = "hero__media hero__img is-orientation-pending";
    const slides = project.slides || [];
    const firstImage = slides.find((src) => src && !isVideoSrc(src)) || "";
    img.src = firstImage || slides[0] || "";
    img.alt = project.alt || project.title || "Project image";
    img.loading = index === 0 ? "eager" : "lazy";

    const video = document.createElement("video");
    video.className = "hero__media hero__video is-orientation-pending";
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

  const createProjectMeta = (className, text, parts) => {
    const meta = document.createElement("p");
    meta.className = className;
    if (!Array.isArray(parts)) {
      meta.textContent = text || "";
      return meta;
    }
    for (const part of parts) {
      if (!part || typeof part.text !== "string") continue;
      // Also validate links in locally edited JSON before making them clickable.
      const href = typeof part.href === "string" ? part.href.trim() : "";
      const safe = /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href) &&
        !/[\u0000-\u001f\u007f\\]/.test(href);
      if (!safe) {
        meta.appendChild(document.createTextNode(part.text));
        continue;
      }
      const link = document.createElement("a");
      link.href = href;
      link.textContent = part.text;
      if (part.target === "_blank") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      meta.appendChild(link);
    }
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
      const caption = document.createElement("div");
      caption.className = "project__caption";
      const captionRight = document.createElement("div");
      captionRight.className = "project__caption-right";
      if (project.category?.trim() || project.categoryParts?.some(part => part.text?.trim())) {
        captionRight.append(createProjectMeta("project__category", project.category, project.categoryParts));
      }
      if (project.showSlideshowCounter === true && project.slides?.length) {
        const counter = document.createElement("p");
        counter.className = "project__side-caption project__slide-counter";
        counter.setAttribute("aria-label", `Slide 1 of ${project.slides.length}`);
        for (const [className, value] of [["project__slide-current", 1], ["project__slide-total", project.slides.length]]) {
          const span = document.createElement("span");
          span.className = className;
          span.textContent = String(value).padStart(3, "0");
          span.setAttribute("aria-hidden", "true");
          counter.append(span);
        }
        captionRight.append(counter);
      } else if (project.sideCaption?.trim()) {
        captionRight.append(createProjectMeta("project__side-caption", project.sideCaption, project.sideCaptionParts));
      }
      caption.append(
        createProjectMeta("project__name", project.displayName || project.title, project.displayNameParts),
        captionRight
      );
      const number = project.projectNumber?.trim() || String(index + 1);
      block.append(
        createProjectMeta("project__number", /^\d+$/.test(number) ? number.padStart(3, "0") : number),
        createHero(project, index),
        caption
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
    })
    .finally(() => window.kspfMarkHomeReady?.("projects"));
})();
