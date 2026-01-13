(() => {
  const container = document.getElementById("projects");
  if (!container) return;

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
    img.className = "hero__img";
    img.src = (project.slides && project.slides[0]) || "";
    img.alt = project.alt || project.title || "Project image";
    img.loading = index === 0 ? "eager" : "lazy";

    const meta = document.createElement("div");
    meta.className = "hero__meta";

    const view = document.createElement("a");
    view.className = "hero__view";
    view.href = project.viewUrl || "#";
    view.target = "_blank";
    view.rel = "noopener";
    view.textContent = "visit site";

    meta.appendChild(view);
    figure.append(prev, next, img, meta);
    return figure;
  };

  const createProjectText = (project) => {
    const section = document.createElement("section");
    section.className = "project";
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
