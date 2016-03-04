var glob = require('glob');
var Path = require('path');
var loaderUtils = require('loader-utils')

exports = module.exports = function(contents) {
  (new Routes(this, {})).compile(this.async());
};

function Routes(loader, opts) {
  this.loader = loader;
  var entry = this.entry = loader.resourcePath;
  this.paramPrefix = opts.paramPrefix ?
    new RegExp('^\\' + opts.paramPrefix) :
    /^\@/;
  this.dir = Path.dirname(entry);
  loader.addContextDependency(this.dir);
  this.ext = Path.extname(entry);
}

Routes.prototype.compile = function(cb) {
  this.matches ?
    next.call(this, null, this.matches) :
    this.glob(next.bind(this));

  function next(err, matches) {
    if (err) return cb(err);
    this.matches = matches;

    this.acc = [];
    this.indent = 0;
    this.compileMatch();
    this.push(''); // add a space between the functions
    this.compileResolve();

    cb(null, this.acc.join('\n'));
  }
};

Routes.prototype.glob = function(cb) {
  glob(this.dir + '/**/*' + this.ext, {mark: true}, function(err, files) {
    if (err) return cb(err);
    cb(null, files.reduce(this.handleFile.bind(this), []));
  }.bind(this));
};

Routes.prototype.handleFile = function(acc, file) {
  var pathname = Path.basename(Path.dirname(file));
  var isDefault = pathname === '__default__';
  var isCatch = pathname === '__catch__';

  // ignore __*__ directories
  if (!isDefault && !isCatch && /__\w+__/.test(file)) return acc;

  // watch directories
  if (file.charAt(file.length - 1) === '/') {
    this.loader.addContextDependency(file);
    return acc;
  }

  var relative = Path.relative(this.dir, Path.dirname(file));
  var parts = relative ? relative.split('/') : [];
  if (isDefault || isCatch) parts.pop();

  if (Path.basename(file, this.ext) === 'index') {
    acc.push({
      route: '/' + relative,
      parts: parts,
      file: file,
      hasParams: parts.some(this.isParam.bind(this)),
      isDefault: isDefault,
      isCatch: isCatch
    });
  }

  return acc;
};

Routes.prototype.compileMatch = function() {
  this.push(
    'exports.match = function(path, decode, cb) {',
    '  if (path.charAt(0) === "/") path = path.slice(1);',
    '  var segments = path ? path.split("/") : [];',
    '  var l = segments.length;',
    '  var components = [];',
    '  var params = {};',
    '  var segment;'
  );

  this.catches = [];
  this.catchId = 0;
  this.componentLevel = 0;
  this.indent = 1;
  var nested = this.nested();
  this.compileMatchRoute(nested, 0);
  this.indent = 0;

  this.push(
    '  cb(null, components, params);',
    '};'
  );
};

Routes.prototype.nested = function() {
  if (this._nested) return this._nested;

  return this._nested = this.matches.reduce(function(acc, route) {
    acc = acc || {file: route.file, route: route.route};
    for (var i = 0, obj = acc, key; i < route.parts.length; i++) {
      key = route.parts[i];
      obj.nested = obj.nested || {};
      obj = obj.nested[key] = obj.nested[key] || {};
    }

    if (route.isDefault) {
      obj.default = route.file;
      obj.defaultRoute = route.route;
    } else if (route.isCatch) {
      obj.$catch = route;
    } else {
      obj.file = route.file;
      obj.route = route.route;
    }

    return acc;
  }, null) || {};
};

Routes.prototype.compileMatchRoute = function(route, index) {
  var hasComponent = !!(route.file || route.default);

  if (route.file) this.compileMatchRoutePush(route);

  var nested = route.nested || {};
  var keys = Object.keys(nested).sort(function(a, b) {
    var isAParam = this.isParam(a);
    var isBParam = this.isParam(b);
    if (isAParam && isBParam) throw new Error('Duplicate params (' + a + ', ' + b + ')');
    if (isAParam) return 1;
    if (isBParam) return -1;
    return a > b ? 1 : -1;
  }.bind(this));

  if (hasComponent || keys.length) {
    this.push('if (l > ' + index + ') {');
    this.indent++;
  }

  if (route.$catch) this.compileMatchPushCatch(route.$catch);

  switch (keys.length) {
    case 0:
      this.compileMatchRouteLeaf();
      break;
    case 1:
      var key = keys[0];
      this.isParam(key) ?
        this.compileMatchRouteSingleParam(index, key, nested[key], hasComponent) :
        this.compileMatchRouteSingleMatch(index, key, nested[key], hasComponent);
      break;
    default:
      this.compileMatchRouteSwitch(index, keys, nested, hasComponent);
  }

  if (route.$catch) this.catches.pop();

  if (hasComponent || keys.length) {
    this.indent--;
    this.push('}');
  }
  if (!hasComponent && keys.length) {
    this.push('else {');
    this.compileMatchRouteFail(1);
    this.push('}');
  }

  if (route.default) {
    this.push('else {');
    this.indent++;
    this.compileMatchRoutePush({
      file: route.default,
      route: route.defaultRoute
    }, false);
    this.indent--;
    this.push('}');
  }

  if (route.file) this.componentLevel--;
};

Routes.prototype.compileMatchRoutePush = function(route, inc) {
  if (inc !== false) this.componentLevel++;
  var file = this.request(route.file);
  this.push(
    'components.push({',
    '  i: require.resolve(' + file + '),',
    '  m: require(' + file + '),',
    '  n: ' + escape(route.route),
    '});'
  );
};

Routes.prototype.compileMatchPushCatch = function($catch) {
  var name = '$catch' + (this.catchId++);

  var file = this.request($catch.file);
  var level = this.componentLevel + 1;

  this.acc.unshift(
    'function ' + name + ' (components, params, cb) {',
    '  components = components.slice(0, ' + level + ');',
    '  components[' + level + '] = {',
    '    i: require.resolve(' + file + '),',
    '    m: require(' + file + '),',
    '    n: ' + escape($catch.route) + '',
    '  };',
    '  cb(null, components, params);',
    '}\n'
  );

  this.catches.push(name);
};

Routes.prototype.compileMatchRouteLeaf = function() {
  this.compileMatchRouteFail();
};

Routes.prototype.compileMatchRouteSingleParam = function(index, key, child, hasComponent) {
  if (!hasComponent) {
    this.push('if (l > ' + index + ') {');
    this.indent++;
  }

  this.push('params[' + escape(this.paramName(key)) + '] = decode(decodeURIComponent(segments[' + index + ']));');
  this.compileMatchRoute(child, index + 1);

  if (!hasComponent) {
    this.indent--;
    this.push('}');
    this.push('else {');
    this.compileMatchRouteFail(1);
    this.push('}');
  }
};

Routes.prototype.compileMatchRouteSingleMatch = function(index, key, child, hasComponent) {
  if (encodeURIComponent(key) !== key) {
    this.push('if (decodeURIComponent(segments[' + index + ']) === ' + escape(key) + ') {');
  } else {
    this.push('if (segments[' + index + '] === ' + escape(key) + ') {');
  }
  this.indent+=1;
  this.compileMatchRoute(child, index + 1);
  this.indent-=1;
  this.push('}');
  this.push('else {');
  this.compileMatchRouteFail(1);
  this.push('}');
};

Routes.prototype.compileMatchRouteSwitch = function(index, keys, children, hasComponent) {
  this.push('segment = decodeURIComponent(segments[' + index + ']);');
  this.push('switch(segment) {');

  var hasParams = false;

  keys.forEach(function(key) {
    if (this.isParam(key)) {
      hasParams = true;
      this.push('  default:');
      this.push('    params[' + escape(this.paramName(key)) + '] = decode(segment);');
    } else {
      this.push('  case ' + escape(key) + ':');
    }

    this.indent+=2;
    this.compileMatchRoute(children[key], index + 1);
    this.indent-=2;
    this.push('    break;');
  }.bind(this));

  if (!hasParams) {
    this.push('  default:');
    this.compileMatchRouteFail(2);
  }

  this.push('}');
};

Routes.prototype.compileMatchRouteFail = function(indent) {
  if (indent) this.indent += indent;
  if (!this.catches.length) {
    this.push('return cb();');
  } else {
    var $catch = this.catches[this.catches.length - 1];
    this.push('return ' + $catch + '(components, params, cb);');
  }
  if (indent) this.indent -= indent;
};

Routes.prototype.push = function() {
  var indent = (new Array(this.indent + 1)).join('  ');
  [].forEach.call(arguments, function(line) {
    this.acc.push(indent + line);
  }.bind(this));
};

Routes.prototype.request = function(request) {
  return loaderUtils.stringifyRequest(this.loader, request);
};

Routes.prototype.isParam = function(name) {
  return this.paramPrefix.test(name);
};

Routes.prototype.paramName = function(param) {
  return param.replace(this.paramPrefix, '');
};

Routes.prototype.compileResolve = function() {
  this.push(
    'exports.resolve = function(id, params, encode) {',
    '  params = params || {};'
  );

  this.indent++;
  this.matches.forEach(function(route) {
    if (route.isCatch) return;
    var check = this.compileResolveParamCheck(route);
    var path = route.hasParams ?
      this.compileResolveParamsFormat(route) :
      escape('/' + route.parts.join('/'));

    this.push('if (id === require.resolve(' + escape(route.file) + ')) return ' + check + ' && ' + path + ';');
  }.bind(this));
  this.indent--;

  this.push('};');
};

Routes.prototype.compileResolveParamCheck = function(route) {
  return route.parts.reduce(function(acc, part) {
    if (this.isParam(part)) acc.push('params[' + escape(this.paramName(part)) + '] != null');
    return acc;
  }.bind(this), ['true']).join(' && ');
};

Routes.prototype.compileResolveParamsFormat = function(route) {
  return route.parts.map(function(part) {
    var item = this.isParam(part) ?
      'encodeURIComponent(encode(params[' + escape(this.paramName(part)) + ']))' :
      escape(encodeURIComponent(part));

    return '"/" + ' + item;
  }.bind(this)).join(' + ');
};

function escape(string) {
  if (typeof string === 'undefined') return 'undefined';
  return JSON.stringify(string);
}
