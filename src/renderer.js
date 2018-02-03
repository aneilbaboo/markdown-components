import { isObject, isArray, isString } from 'lodash';

/**
 * Renderer
 *
 * @param {any} options
 * @param {Object} components - { componentName: function (renderer, tagName, attrs, children, stream)
 *                              => writes HTML to stream, ... }
 * @param {Function} markdownEngine - function (markdown, render) => writes HTML to stream
 * @param {Function} defaultComponent - function (renderer, tagName, attrs, children, stream)
 * @param {Function} interpolator - optional interpolation function (variables, expr) => value (default is standardInterpolator)
 *
 * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
 * interpolator uses the expression inside {} to extract a value from variables
 */
export default class Renderer {
  constructor({ components, markdownEngine, defaultComponent, interpolator }) {
    this._components = {};
    for (var key in components || {}) {
      this._components[key.toLowerCase()] = components[key];
    }
    this._defaultComponent = defaultComponent || standardDefaultComponent;
    this._interpolator = interpolator || standardInterpolator;
    this._markdownEngine = markdownEngine;
  }

  componentFromElement(element) {
    return this._components[element.name.toLowerCase()] || this._defaultComponent;
  }

  writeElement(elt, context, stream) {
    const _this = this;
    const render = function (obj) {
      if (isString(obj)) {
        stream.write(obj);
      } else {
        _this.write(obj, context, stream);
      }
    };

    // render markdown
    if (elt.type==='text') {
      this.renderTextElement(elt, context, render);
    } else {
      // or a component:
      const component = this.componentFromElement(elt) || this._defaultComponent;
      if (component) {
        // inject __name and __children into props
        const interpolatedAttributes = Object.assign(
          { __name: elt.name, __children: elt.children },
          interpolateAttributes(elt.attrs, context, _this._interpolator)
        );
        component(interpolatedAttributes, render);
      }
    }
  };

  write(elt, context, stream) {
    if (!elt) {
      return;
    } else if (isArray(elt)) {
      var _this = this;
      var elements = elt;
      elements.forEach(function (elt) {
        _this.write(elt, context, stream);
      });
    } else if (isObject(elt)) {
      this.writeElement(elt, context, stream);
    } else {
      throw new Error(`Unexpected dom element: ${JSON.stringify(elt)}`);
    }
  }

  renderTextElement(textElement, context, render) {
    var interpolatedMarkdown = textElement.blocks.map(block=>
      block.type==='interpolation' ? this._interpolator(context, block.accessor) : block
    ).join('');

    this._markdownEngine(interpolatedMarkdown, render);
  }
}

function standardDefaultComponent(props, render) {
  var tagName = props.__name;
  var children = props.__children;
  var attrs = Object.assign({}, props);
  delete attrs.__name;
  delete attrs.__children;

  render(`<${tagName}`);
  for (var attr in attrs) {
    render(' %s=%j', attr, attrs[attr]);
  }
  render('>');
  render(children);
  render(`</${tagName}>`);
}

function standardInterpolator(variables, accessor) {
  if (isArray(accessor)) {
    if (accessor.length===0) {
      return variables;
    } else {
      if (variables) {
        return standardInterpolator(variables[accessor[0]], accessor.slice(1));
      }
    }
  } else {
    return standardInterpolator(variables, accessor.split('.'));
  }
}

function interpolateAttributes(attrs, context, interpolator) {
  var props = {};
  if (attrs) {
    for (var key in attrs) {
      var value = attrs[key];
      if (isObject(value)) {
        props[key] = interpolator(context, value.accessor);
      } else {
        props[key] = value;
      }
    }
  }
  return props;
}
