const proxy = require("http-proxy-middleware");

if (!process.env.NODE_ENV === 'development') {
   throw new Error(`Invalid node env: ${process.env.NODE_ENV}`);
}

// See package.json
const proxy_to = process.env.REACT_APP_API_URL;

module.exports = function(app) {
  app.use(
    proxy("/api/streams", {
      target: "ws://" + proxy_to,
      ws: true,
      logLevel: "debug"
    })
  );
  app.use(
    proxy("/api", {
      target: "http://" + proxy_to,
      logLevel: "debug"
    })
  );
};
