const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const appRoot = __dirname;
const workspaceRoot = path.resolve(appRoot, "../..");

const config = getDefaultConfig(appRoot);

config.watchFolders = [appRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(appRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
