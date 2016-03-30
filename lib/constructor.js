var routes = require(__ROUTES__);

var _routers = [];

module.exports = Router;

function noopFormat(value) { return value; }

function Router(onchange, location, format) {
  this.onchange = onchange;
  if (location) this.set(location);
  if (module.hot) _routers.push(this);
  this.format = format || {
    encode: noopFormat,
    decode: noopFormat
  };
}

Router.prototype = {
  set: function(location) {
    var self = this;
    self.location = location;
    self.reload();
    return self;
  },
  resolve: function(id, params) {
    return routes.resolve(id, params, this.format.encode);
  },
  reload: function() {
    var self = this;
    routes.match(self.location.pathname, self.format.decode, function(err, components, params) {
      if (err) return console.error(err.stack || err);
      self.onchange(components, params, self.location);
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
