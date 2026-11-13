# Lenis 1.3.26

Official npm distribution: https://registry.npmjs.org/lenis/-/lenis-1.3.26.tgz

Tarball integrity verified before extraction:
`sha512-s/xTCZCxTFvHbAN1OzuhNaN5YPJH2ail0XAkctKW1b+RUAG4nUL5UHLXwNko1h8aEeT2jspBXegMgPJd8zcuag==`

`lenis.module.js` is the distribution's `dist/lenis.mjs`, with the filename
changed to work with the existing Storyblok preview server's JavaScript asset
allowlist and MIME types. The code is unmodified. Its optional source map is
not included. The MIT license is included alongside it.

Vendoring keeps the static homepage independent of a build step and third-party
CDN availability. Only the homepage imports it. It is not a Next.js dependency.

Documentation: https://github.com/darkroomengineering/lenis
