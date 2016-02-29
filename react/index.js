var fs = require('fs');
var loaderUtils = require('loader-utils');
var qs = require.resolve('qs');
var assign = require.resolve('object-assign');
var loader = require.resolve('../');

var ConstructorPath = __dirname + '/router.js';

var mapping = {
  'browser': require.resolve('history/lib/createBrowserHistory'),
  'dom': require.resolve('history/lib/createDOMHistory'),
  'hash': require.resolve('history/lib/createHashHistory'),
  'memory': require.resolve('history/lib/createMemoryHistory')
};

exports = module.exports = function() {};
exports.pitch = function(request) {
  var stringifyRequest = loaderUtils.stringifyRequest.bind(null, this);

  var query = loaderUtils.parseQuery(this.query);

  var history = mapping[query.history] || query.history || mapping.browser;

  var cb = this.async();

  this.addDependency(ConstructorPath);
  fs.readFile(ConstructorPath, 'utf8', function(err, Constructor) {
    if (err) return cb(err);
    cb(null, Constructor
      .replace(/__ROUTER__/g, stringifyRequest('!!' + loader + '!' + request))
      .replace(/__HISTORY__/g, stringifyRequest(history))
      .replace(/__QS__/g, stringifyRequest(qs))
      .replace(/__ASSIGN__/g, stringifyRequest(assign)));
  }.bind(this));
};
