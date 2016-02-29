var React = require('react');

exports.componentWillMount = function() {
  var self = this;
  var router = self.router = this.context.router;
  self.getCurrentLocation = function() {
    return router.location;
  };
};

exports.contextTypes = {
  router: React.PropTypes.object.isRequired
};
