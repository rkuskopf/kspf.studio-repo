(() => {
  if (typeof window.StoryblokBridge !== "function") return;

  const refreshAndReload = async () => {
    try {
      const response = await window.fetch("/__storyblok/refresh", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Storyblok draft refresh failed.");
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const bridge = new window.StoryblokBridge();
  bridge.on(["change", "published"], refreshAndReload);
})();
