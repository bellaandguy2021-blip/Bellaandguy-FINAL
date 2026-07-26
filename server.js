// Custom entrypoint required by Hostinger's Passenger-based Node hosting,
// which starts the app by directly requiring this file rather than running
// `next start` — a plain Next.js project has no such file by default.
const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});
