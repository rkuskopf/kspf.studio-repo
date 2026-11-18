(() => {
  const dimensions = window.kspfMediaDimensions || {};
  const aspect = (src) => {
    const size = dimensions[src];
    if (size?.[0] > 0 && size?.[1] > 0) return size[0] / size[1];
    const match = /^https:\/\/a\.storyblok\.com\/f\/\d+\/(\d+)x(\d+)\//.exec(src || '');
    return match && Number(match[2]) > 0 ? Number(match[1]) / Number(match[2]) : null;
  };
  const cloudinary = (src, transformation) => {
    // Only transform original delivery URLs; preserve signed/custom deliveries.
    const match = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(v\d+\/.*)$/.exec(src || '');
    return match ? `${match[1]}${transformation}/${match[2]}` : src;
  };
  window.kspfMediaLayout = {
    aspect,
    frame(slides) {
      const aspects = slides.map(aspect);
      const valid = aspects.filter(value => value > 0);
      const landscape = valid.filter(value => value >= 1);
      return {
        desktop: valid.length ? Math.max(...valid) : 1.6,
        mobileLandscape: landscape.length ? Math.min(...landscape) : null,
        hasPortrait: !aspects.length || aspects.some(value => !value || value < 1),
      };
    },
    image(src, width = 1080) {
      if (/^https:\/\/a\.storyblok\.com\/f\/\d+\/\d+x\d+\//.test(src || '')) {
        return `${src}/m/${width}x0/filters:quality(80)`;
      }
      return cloudinary(src, `w_${width},c_limit,q_auto,f_auto`);
    },
    poster(src) {
      const result = cloudinary(src, 'so_0,w_540,q_auto,f_jpg');
      return result !== src ? result.replace(/\.(?:mp4|mov|webm|m4v)(?=[?#]|$)/i, '.jpg') : '';
    },
  };
})();
