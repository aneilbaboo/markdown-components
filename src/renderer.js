import { isObject, isArray, isString } from 'lodash';
import { isNumber } from 'util';
import assert from 'assert';

/**
 * Renderer
 *
 * @param {any} options
 * @param {Object} components - { componentName: function (renderer, tagName, attrs, children, stream)
 *                              => writes HTML to stream, ... }
 * @param {Function} defaultComponent - function (renderer, tagName, attrs, children, stream)
 * @param {Function} interpolator - optional interpolation function (variables, expr) => value (default is standardInterpolator)
 *
 * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
 * interpolator uses the expression inside {} to extract a value from variables
 */
export default class Renderer {
  constructor({ components, defaultComponent, interpolator }) {
    this._components = {};
    for (var key in components) {
      this._components[key.toLowerCase()] = components[key];
    }
    this._defaultComponent = defaultComponent;
    this._interpolator = interpolator || standardInterpolator;
  }

  componentFromElement(element) {
    var component = this._components[element.name] || this._defaultComponent;
    if (!component) {
      throw new Error(`No component named ${element.rawName}`);
    }
    return component;
  }

  writeElement(elt, context, stream) {
    const _this = this;
    const render = function (obj, newContext) {
      newContext = newContext || context;
      if (isString(obj) || isNumber(obj)) {
        stream.write(obj);
      } else {
        _this.write(obj, newContext, stream);
      }
    };

    // render markdown
    if (elt.type==='text') {
      this.renderTextElement(elt, context, render);
    } else {
      // or a component:
      const component = this.componentFromElement(elt);
      // inject special vars into props
      const interpolatedAttributes = Object.assign(
        { __name: elt.name, __children: elt.children },
        interpolateAttributes(elt.attrs, context, _this._interpolator)
      );
      component(interpolatedAttributes, render);
    }
  };

  write(elt, context, stream) {
    if (isArray(elt)) {
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
    textElement.blocks.forEach(block => {
      if (isString(block)) {
        render(block);
      } else {
        assert(block.type==='interpolation');
        render(this._interpolator(context, block.accessor));
      }
    });
  }
}

function standardInterpolator(variables, accessor) {
  if (isArray(accessor)) {
    if (accessor.length===0) {
      return variables;
    } else {
      return standardInterpolator(variables[accessor[0]], accessor.slice(1));
    }
  } else {
    return standardInterpolator(variables, accessor.split('.'));
  }
}

function interpolateAttributes(attrs, context, interpolator) {
  var props = { ...context };
  for (var key in attrs) {
    var value = attrs[key];
    if (isObject(value)) {
      props[key] = interpolator(context, value.accessor);
    } else {
      props[key] = value;
    }
  }
  return props;
}
