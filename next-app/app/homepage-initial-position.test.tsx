// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import HomepageInitialPosition from "./homepage-initial-position";

it("uses the INFO link to return to Work only while viewing three-column Information", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  container.innerHTML = `
    <section id="information" class="homepage-information--three-columns"></section>
    <section id="work" tabindex="-1"><a class="homepage-nav__information" href="#information">INFO</a></section>
    <div data-mount></div>
  `;
  document.body.append(container);
  const root = createRoot(container.querySelector("[data-mount]")!);
  const originalUrl = window.location.href;
  const information = container.querySelector<HTMLElement>("#information")!;
  const work = container.querySelector<HTMLElement>("#work")!;
  const link = container.querySelector<HTMLAnchorElement>("a")!;
  const infoBounds = vi.spyOn(information, "getBoundingClientRect");
  const workBounds = vi.spyOn(work, "getBoundingClientRect");
  const scrollToWork = vi.spyOn(work, "scrollIntoView");
  try {
    history.replaceState(null, "", "#work");
    await act(async () => root.render(<HomepageInitialPosition section="work" />));
    infoBounds.mockReturnValue(new DOMRect(0, -700, 800, 700));
    workBounds.mockReturnValue(new DOMRect(0, 0, 800, 1000));
    link.addEventListener("click", (event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    }, { once: true });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(link.getAttribute("href")).toBe("#information");

    history.replaceState(null, "", "#information");
    infoBounds.mockReturnValue(new DOMRect(0, 0, 800, 700));
    workBounds.mockReturnValue(new DOMRect(0, 700, 800, 1000));
    const returnToWork = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(returnToWork);
    expect(returnToWork.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe("#work");
    expect(scrollToWork).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(work);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    history.replaceState(null, "", originalUrl);
    vi.unstubAllGlobals();
  }
});
