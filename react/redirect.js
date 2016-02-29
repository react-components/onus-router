var React = require('react');
var createElement = React.createElement;

var Redirect = React.createClass({
  mixins: [require('./component-mixins')],
  displayName: 'Redirect',
  getDefaultProps: function() {
    return {
      replace: true
    };
  },
  componentDidMount: function() {
    this._redirect(this.props);
  },
  componentWillRecieveProps: function(nextProps) {
    this._redirect(nextProps);
  },
  _redirect: function(props) {
    var router = this.context.router;
    props.replace ? router.replace(props) : router.push(props);
  },
  render: function() {
    return false;
  }
});

exports = module.exports = Redirect;
exports['default'] = Redirect;
