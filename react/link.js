var React = require('react');
var createElement = React.createElement;
var assign = require('object-assign');

exports = module.exports = React.createClass({
  mixins: [require('./component-mixins')],
  displayName: 'Link',
  contextTypes: {
    activeLinkClassName: React.PropTypes.string,
    activeLinkStyle: React.PropTypes.object
  },
  getDefaultProps: function() {
    return {
      onlyActiveOnIndex: false,
      className: '',
      style: {}
    };
  },
  handleClick: function(event) {
    var props = this.props;
    if (props.onClick) props.onClick(event);
    if (isModifiedEvent(event) || !isLeftClickEvent(event)) return;

    var allowTransition = event.defaultPrevented !== true;

    if (props.target) {
      if (!allowTransition) event.preventDefault();
      return;
    }

    event.preventDefault();

    if (allowTransition) this.context.router.push(props);
  },
  render: function render() {
    var _props = this.props;

    var props = _objectWithoutProperties(_props, [
      'to',
      'params',
      'query',
      'hash',
      'state',
      'activeClassName',
      'activeStyle',
      'onlyActiveOnIndex',
      'inherit',
      'inheritParams',
      'inheritQuery'
    ]);

    if (isAbsoluteLink(props)) return createElement('a', props);

    var to = _props.to;
    var params = _props.params;
    var query = _props.query;
    var hash = _props.hash;
    var state = _props.state;
    var activeClassName = _props.activeClassName;
    var activeStyle = _props.activeStyle;
    var onlyActiveOnIndex = _props.onlyActiveOnIndex;
    var inherit = _props.inherit;
    var inheritParams = _props.inheritParams;
    var inheritQuery = _props.inheritQuery;

    var context = this.context;
    var router = context.router;

    var descriptor = router.resolve(this.props, false);

    if (descriptor) {
      props.href = router.createHref(descriptor);

      if (!activeClassName) activeClassName = context.activeLinkClassName;
      if (!activeStyle) activeStyle = context.activeLinkStyle;
      if (activeClassName || activeStyle) {
        if (router.isActive(descriptor, onlyActiveOnIndex)) {
          if (activeClassName) props.className += props.className === '' ? activeClassName : ' ' + activeClassName;
          if (activeStyle) props.style = assign({}, props.style, activeStyle);
        }
      }
    }

    props.onClick = descriptor ?
      this.handleClick :
      function(event) {event.preventDefault()};

    return createElement('a', props);
  }
});
exports['default'] = exports;

function isLeftClickEvent(event) {
  return event.button === 0;
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function isAbsoluteLink(props) {
  if (/^(http|\/)/.test(props.to || '')) {
    props.href = props.to;
    delete props.to;
    return true;
  }
}

function _objectWithoutProperties(obj, keys) {
  var target = {};
  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }
  return target;
}
