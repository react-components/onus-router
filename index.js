var fs = require('fs');
var loaderUtils = require('loader-utils');

var matcher = require.resolve('./lib/routes-loader');
var ConstructorPath = __dirname + '/lib/constructor.js';
var selfReq = require.resolve('./');

exports = module.exports = function() {};
exports.pitch = function(request) {
  var stringifyRequest = loaderUtils.stringifyRequest.bind(null, this);

  var cb = this.async();

  this.addDependency(ConstructorPath);
  fs.readFile(ConstructorPath, 'utf8', function(err, Constructor) {
    if (err) return cb(err);
    cb(null, Constructor
      .replace(/__ROUTES__/g, stringifyRequest("!!" + matcher + '!' + request)));
  });
};
