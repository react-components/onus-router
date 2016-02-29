var React = require('react');

exports.contextTypes = {
  router: React.PropTypes.object.isRequired
};

exports.getDefaultProps = function() {
  return {
    inherit: false,
    inheritParams: true,
    inheritQuery: false
  }
};
