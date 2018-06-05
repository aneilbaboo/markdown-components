import { isObject, isArray, isString } from 'lodash';
import { isNumber } from 'util';
import { evaluate } from './evaluator';

/**
 * Renderer
 *
 * @param {any} options
 * @param {Object} components - { componentName: function (renderer, tagName, attrs, children, stream)
 *                              => writes HTML to stream, ... }
 * @param {Function} defaultComponent - function (renderer, tagName, attrs, children, stream)
 * @param {{ [key: string]: (context, ...args) => }} functions - functions that may appear inside interpolation blocks
 *
 * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
 * interpolator uses the expression inside {} to extract a value from variables
 */
export default class Renderer {
  constructor({ components, defaultComponent }) {
    this._components = {};
    for (var key in components) {
      this._components[key.toLowerCase()] = components[key];
    }
    this._defaultComponent = defaultComponent;
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
      const interpolatedAttrs = Object.assign(
        { __name: elt.name, __children: elt.children },
        this.interpolateAttributes(elt.attrs, context)
      );
      component(interpolatedAttrs, render);
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
      if (isInterpolation(block)) {
        render(evaluate(block.expression, context, this._functions));
      } else {
        render(block);
      }
    });
  }

  interpolateAttributes(attrs, context) {
    var props = { ...context };
    for (var key in attrs) {
      var value = attrs[key];
      if (isInterpolation(value)) {
        props[key] = evaluate(value.expression, context, this._functions);
      } else {
        props[key] = value;
      }
    }
    return props;
  }

}

function isInterpolation(o) {
  return isObject(o) && o.type === 'interpolation';
}

