var React = require('react');
var createElement = React.createElement;
var assign = require('object-assign');

var Link = React.createClass({
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
    }
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
  render: function() {
    var { to, params, query, hash, state, activeClassName, activeStyle, onlyActiveOnIndex, inherit, inheritParams, inheritQuery, ...props } = this.props;
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

exports = module.exports = Link;
exports['default'] = Link;

function isLeftClickEvent(event) {
  return event.button === 0;
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
