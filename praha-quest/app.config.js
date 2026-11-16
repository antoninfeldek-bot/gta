// Web builds for GitHub Pages live under /<repo>/, so the base URL is set per build:
//   WEB_BASE_URL=/gta npm run build:web
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}) },
});
