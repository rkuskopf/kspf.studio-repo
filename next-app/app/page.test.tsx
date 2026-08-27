import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("the initial App Router route", () => {
  it("renders the KSPF foundation heading", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    expect(markup).toContain("<h1>KSPF</h1>");
  });
});
