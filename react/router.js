var React = require('react');
var createElement = React.createElement;
var R = require(__ROUTER__);
var createHistory = require(__HISTORY__);
__ENHANCERS__
var assign = require(__ASSIGN__);
var QS = require(__QS__);

var proto = {
  displayName: 'Router',
  childContextTypes: {
    router: React.PropTypes.object,
    activeLinkClassName: React.PropTypes.string,
    activeLinkStyle: React.PropTypes.object
  },
  getInitialState: function() {
    return {
      components: [],
      componentIds: {},
      params: {},
      query: {}
    };
  },
  componentWillMount: function() {
    var self = this;
    var props = self.props;

    self.router = new R(this._onRouteMatch, null, props.format);

    var history = self.history = (props.enhancers || []).reduce(function(history, enhancer) {
      return enhancer(history);
    }, props.history || createHistory(props));

    self._unlisten = history.listen(this._onHistoryChange);

    if (props.listenBefore) history.listenBefore(props.listenBefore);
  },
  _onHistoryChange: function(location) {
    var pathname = location.pathname;

    // remove trailing slashes
    if (pathname !== '/' && pathname.charAt(pathname.length - 1) === '/') {
      location.pathname = pathname.slice(0, -1);
      return this.history.replace(location);
    }

    this.router.set(pathname);
    this.setState(assign({
      query: this._parseSearch(location.search)
    }, location));
  },
  _onRouteMatch: function(components, params) {
    if (!components) {
      console.error('No route for ' + JSON.stringify(this.router.path));
      components = [];
    }

    var activeComponent = components[components.length - 1] || {};

    this.setState({
      components: components,
      activeComponent: activeComponent.i,
      activeComponentName: activeComponent.n,
      componentIds: components.reduce(function(acc, component) {
        acc[component.i] = true;
        return acc;
      }, {}),
      params: params || {}
    });
  },
  componentWillReceiveProps: function(nextProps) {
    if (nextProps.format) this.router.format = nextProps.format;
  },
  componentWillUnmount: function() {
    this._unlisten();
    this.router.stop();
  },
  _parseSearch: function(search) {
    search = search || '';
    if (search.charAt(0) === '?') search = search.slice(1);
    return QS.parse(search);
  },
  _formatSearch: function(query) {
    query = QS.stringify(query);
    return query ? '?' + query : query;
  },
  resolve: function(descriptor, strict) {
    if (!descriptor) return null;
    var location = this.state;
    var inherit = descriptor.inherit;

    var params = inherit || descriptor.inheritParams ?
      assign({}, location.params, descriptor.params) :
      descriptor.params;

    var query = inherit || descriptor.inheritQuery ?
      assign({}, location.query, descriptor.query) :
      descriptor.query;

    var hash = !inherit || hash != null ?
      descriptor.hash :
      location.hash;

    var id = descriptor.id || descriptor.to || (inherit && location.activeComponent);
    var pathname = descriptor.pathname || this.router.resolve(id, params);

    if (typeof pathname === 'undefined') {
      var errorMessage = 'Cannot find route "' + id + '". Try \'require.resolve("./path/to/route")\'';
      if (strict !== false) {
        throw new Error(errorMessage);
      } else {
        console.error(errorMessage);
      }
    }

    return pathname ? {
      id: id,
      params: params || {},
      query: query || {},
      hash: hash || '',
      state: descriptor.state,
      pathname: pathname,
      search: descriptor.search || this._formatSearch(query)
    } : pathname;
  },
  isActive: function(descriptor, onlyActiveOnIndex) {
    if (!descriptor) return false;
    var state = this.state;
    var router = this.router;

    var id = descriptor.id || descriptor.to;

    // Make sure the parameters are equal
    var pathname = router.resolve(id, descriptor.params);
    if (!pathname || pathname !== router.resolve(id, state.params)) return false;

    // if we're checking a leaf-node the query should match up
    if (id === state.activeComponent && this._formatSearch(descriptor.query) !== state.search) return false;

    return onlyActiveOnIndex ?
      id === state.activeComponent :
      !!state.componentIds[id];
  },
  getChildContext: function() {
    var self = this;
    var history = this.history;

    var router = {
      push: this.push,
      replace: this.replace,
      resolve: this.resolve,
      createHref: this.createHref,
      createPath: this.createPath,
      createLocation: this.createLocation,
      go: history.go,
      goBack: history.goBack,
      goForward: history.goForward,
      isActive: this.isActive
    };

    Object.defineProperty(router, 'location', {
      get: function() {
        return self.state;
      }
    });

    return {
      router: router,
      activeLinkClassName: this.props.activeLinkClassName,
      activeLinkStyle: this.props.activeLinkStyle
    };
  },
  render: function() {
    var state = this.state;
    var onChange = this.props.onChange;
    if (onChange) onChange(state);
    return state.components.reduceRight(function(acc, component) {
      if (!component || !component.m) return null;
      component = component.m;
      return createElement(component['default'] || component, null, acc);
    }, null);
  }
};

['createHref', 'createPath', 'createLocation', 'push', 'replace'].forEach(function(name) {
  proto[name] = function(descriptor, strict) {
    var location = this.resolve(descriptor, strict);
    return location ? this.history[name](location) : null;
  }
});

exports = module.exports = React.createClass(proto);
exports['default'] = exports;
