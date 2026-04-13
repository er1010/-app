async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

export async function loadThemePack(basePath = "./data/sbti") {
  const [questionSet, dimensionSet, typeSet, ruleSet, themeSet] = await Promise.all([
    loadJson(`${basePath}/question-set.json`),
    loadJson(`${basePath}/dimension-set.json`),
    loadJson(`${basePath}/type-set.json`),
    loadJson(`${basePath}/rule-set.json`),
    loadJson(`${basePath}/theme-set.json`)
  ]);

  let imageMap = new Map();
  const manifestPath = themeSet?.assets?.imageManifestPath;
  if (manifestPath) {
    try {
      const manifest = await loadJson(manifestPath);
      imageMap = new Map(
        (manifest.entries ?? []).map((entry) => [entry.code, entry.fileName])
      );
    } catch {
      imageMap = new Map();
    }
  }

  return {
    questionSet,
    dimensionSet,
    typeSet,
    ruleSet,
    themeSet,
    imageMap
  };
}
