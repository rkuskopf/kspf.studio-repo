(() => {
  const normalizeEmail = (value) => {
    if (!value) return "";
    return value.replace(/^mailto:/i, "");
  };

  const setText = (el, value) => {
    if (!el || value === undefined || value === null) return;
    el.textContent = value;
  };

  const setHref = (el, value) => {
    if (!el || !value) return;
    el.setAttribute("href", value);
  };

  const setEmail = (el, value) => {
    if (!el || !value) return;
    const email = normalizeEmail(value);
    el.textContent = email;
    el.setAttribute("href", `mailto:${email}`);
  };

  const setBodyHtml = (el, value) => {
    if (!el || value === undefined || value === null) return;
    const html = String(value)
      .split("\n")
      .map((line) => line.trim())
      .join("<br>");
    el.innerHTML = html;
  };

  const renderFooter = (footer) => {
    if (!footer || !Array.isArray(footer.columns)) return;
    const titleEl = document.querySelector(".footer__title");
    setText(titleEl, footer.title);

    const servicesWrap = document.querySelector(".footer__services");
    if (!servicesWrap) return;
    servicesWrap.innerHTML = "";

    footer.columns.forEach((column) => {
      const colEl = document.createElement("div");
      colEl.className = "footer__services-column";

      const groups = Array.isArray(column.groups) ? column.groups : [];
      groups.forEach((group) => {
        if (!group) return;
        const groupEl = document.createElement("div");
        groupEl.className = "footer__services-group";

        if (group.href) {
          const headingLink = document.createElement("a");
          headingLink.className = "footer__services-heading";
          headingLink.href = group.href;
          headingLink.textContent = group.heading || "";
          groupEl.appendChild(headingLink);
        } else {
          const heading = document.createElement("p");
          heading.className = "footer__services-heading";
          heading.textContent = group.heading || "";
          groupEl.appendChild(heading);
        }

        const items = Array.isArray(group.items) ? group.items : [];
        if (items.length) {
          const listEl = document.createElement("ul");
          listEl.className = "footer__services-list";
          items.forEach((item) => {
            if (!item) return;
            const li = document.createElement("li");
            li.textContent = item;
            listEl.appendChild(li);
          });
          groupEl.appendChild(listEl);
        }

        colEl.appendChild(groupEl);
      });

      servicesWrap.appendChild(colEl);
    });
  };

  const applySiteContent = (data) => {
    if (!data) return;

    const nav = data.nav || {};
    const info = data.informationOverlay || {};

    const homeLinks = document.querySelectorAll(".nav__link--home");
    homeLinks.forEach((link) => {
      setText(link, nav.homeLabel);
      setHref(link, nav.homeHref);
    });

    const infoToggles = document.querySelectorAll(".js-information-toggle");
    infoToggles.forEach((btn) => setText(btn, nav.informationLabel));

    const infoCloses = document.querySelectorAll(".js-information-close");
    infoCloses.forEach((btn) => setText(btn, nav.closeLabel));

    const servicesLinks = document.querySelectorAll(".nav__link--case");
    servicesLinks.forEach((link) => {
      setText(link, nav.servicesLabel);
      setHref(link, nav.servicesHref);
    });

    setText(document.querySelector(".js-info-contact-title"), info.contactTitle);
    setBodyHtml(document.querySelector(".js-info-contact-body"), info.contactBody);
    setEmail(document.querySelector(".js-info-contact-email"), info.contactEmail);
    setText(document.querySelector(".js-info-services-title"), info.servicesTitle);

    const servicesList = document.querySelector(".js-info-services-list");
    if (servicesList && Array.isArray(info.services)) {
      servicesList.innerHTML = "";
      info.services.forEach((service) => {
        if (!service) return;
        const li = document.createElement("li");
        li.textContent = service;
        servicesList.appendChild(li);
      });
    }

    renderFooter(data.footer);
  };

  const targetsExist =
    document.querySelector(".nav__link--home") ||
    document.querySelector(".footer__services") ||
    document.querySelector(".js-info-contact-title");

  if (!targetsExist) return;

  fetch("content/site.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => applySiteContent(data))
    .catch(() => {});
})();
