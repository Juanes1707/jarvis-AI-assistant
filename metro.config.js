const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Archive and design evidence are never application modules.
config.resolver.blockList = [
  new RegExp("^" + escape(path.join(__dirname, "artifacts")) + "[/\\\\].*"),
  new RegExp("^" + escape(path.join(__dirname, "docs")) + "[/\\\\].*"),
  new RegExp("^" + escape(path.join(__dirname, ".next")) + "[/\\\\].*"),
];
module.exports = config;
