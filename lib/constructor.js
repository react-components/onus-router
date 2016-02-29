var routes = require(__ROUTES__);

var _routers = [];

module.exports = Router;

function noopFormat(value) { return value; }

function Router(onchange, path, format) {
  this.onchange = onchange;
  if (path) this.set(path);
  if (module.hot) _routers.push(this);
  this.format = format || {
    encode: noopFormat,
    decode: noopFormat
  };
}

Router.prototype = {
  set: function(path) {
    var self = this;
    self.path = path;
    self.reload();
    return self;
  },
  resolve: function(id, params) {
    return routes.resolve(id, params, this.format.encode);
  },
  reload: function() {
    var self = this;
    routes.match(self.path, this.format.decode, function(err, components, params) {
      if (err) return console.error(err.stack || err);
      self.onchange(components, params);
    });
  },
  stop: function() {
    if (module.hot) {
      var self = this;
      _routers = _routers.filter(function(router) {
        return router !== self;
      });
    }
    return this;
  }
};

if (module.hot) {
  module.hot.accept(__ROUTES__, function() {
    routes = require(__ROUTES__);
    _routers.forEach(function(router) {
      router.reload();
    });
  });
}
