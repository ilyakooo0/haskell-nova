exports.getHLSConfig = () => readAllConfigs(HLSKeys);

// X must be an object. It is modified in place and returned.
// The second is also an object and is merged into the left one.
function merge(x, y) {
  for (key in y) {
    if (typeof y[key] == "object" && x[key] && typeof x[key] == "object") {
      x[key] = merge(x[key], y[key]);
    } else {
      x[key] = y[key];
    }
  }
  return x;
}

function objectifyString(s, v) {
  let previous = v;
  for (key of s.split(".").reverse()) {
    const next = {};
    next[key] = previous;
    previous = next;
  }
  return previous;
}

function readOneConfig(key) {
  return objectifyString(key, nova.workspace.config.get(key));
}

function readAllConfigs(keys) {
  return keys.map(readOneConfig).reduce(merge, {});
}
const HLSKeys = [
  "haskell.formattingProvider",
  "haskell.checkProject",
  "haskell.maxCompletions",
  "haskell.plugin.importLens.codeActionsOn",
  "haskell.plugin.importLens.codeLensOn",
  "haskell.plugin.hlint.codeActionsOn",
  "haskell.plugin.hlint.diagnosticsOn",
  "haskell.plugin.hlint.config.flags",
  "haskell.plugin.eval.globalOn",
  "haskell.plugin.moduleName.globalOn",
  "haskell.plugin.splice.globalOn",
  "haskell.plugin.haddockComments.globalOn",
  "haskell.plugin.class.globalOn",
  "haskell.plugin.retrie.globalOn",
  "haskell.plugin.tactics.globalOn",
  "haskell.plugin.tactics.config.auto_gas",
  "haskell.plugin.tactics.config.hole_severity",
  "haskell.plugin.tactics.config.max_use_ctor_actions",
  "haskell.plugin.tactics.config.timeout_duration",
  "haskell.plugin.tactics.config.proofstate_styling",
  "haskell.plugin.pragmas.codeActionsOn",
  "haskell.plugin.pragmas.completionOn",
  "haskell.plugin.ghcide-completions.config.autoExtendOn",
  "haskell.plugin.ghcide-completions.config.snippetsOn",
  "haskell.plugin.ghcide-type-lenses.globalOn",
  "haskell.plugin.ghcide-type-lenses.config.mode",
  "haskell.plugin.refineImports.globalOn",
];
