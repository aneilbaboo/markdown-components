(function () {
  var htmlparser = require("htmlparser");
  var util = require('util');
  var isObject = util.isObject;
  var isArray = util.isArray;
  var streams = require('memory-streams');
 
  function parse(input) {
    var parsedDOM;
    var handler = new htmlparser.DefaultHandler(function (error, dom) {
      if (error) {
        throw error;
      } else {
        parsedDOM = dom;
      }
    });

    var parser = new htmlparser.Parser(handler, { recognizeSelfClosing: true });
    parser.parseComplete(input);

    return parsedDOM;

  };
  
  function standardDefaultComponent(renderer, tagName, attrs, children, stream) {
    stream.write(`<${tagName}`);
    for (var attr in attrs) {
      stream.write('')
    }
    renderer.write(children);
    stream.write(`</${tagName}>`);
  }

  function standardInterpolator(variables, accessor) {
    if (isArray(accessor)) {
      if (accessor.length==0) {
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

  function parseAttributes(elt, env, interpolator) {
    debugger;
    if (elt.data) {
      const rawAttrs = elt.data.split(/\s+(.*)/)[1];
      const attrRE = /(\w+)=((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|(?:#{([^}]*)}))/g
      var match;
      var result = {};
      while ((match=attrRE.exec(rawAttrs))!=null) {
        var variable = match[1]
        if (match[3]) { // string
          result[variable] = match[3];
        } else if (match[4]) { // number
          result[variable] = parseFloat(match[4]);
        } else if (match[5]) { // interpolation 
          result[variable] = interpolator(env, match[5].trim(' '));
        }
      }
      return result;
    } else {
      return {};
    }
  }

  /**
   * Renderer
   * 
   * @param {any} options
   * @param {Object} components - { componentName: function (renderer, tagName, attrs, children, stream) => writes HTML to stream, ... }
   * @param {Function} markdownEngine - function (markdown, stream) => writes HTML to stream
   * @param {Function} defaultComponent - function (renderer, tagName, attrs, children, stream)
   * @param {Function} interpolator - optional interpolation function (variables, expr) => value (default is standardInterpolator)
   * 
   * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
   * interpolator uses the expression inside #{} to extract a value from variables
   */
  function Renderer({ components, markdownEngine, defaultComponent, interpolator }) {
    this._components = {};
    for (var key in components || {}) {
      this._components[key.toLowerCase()] = components[key];
    }
    this._defaultComponent = defaultComponent || standardDefaultComponent;
    this._interpolator = interpolator || standardInterpolator;
    this._markdownEngine = markdownEngine;
  }

  Renderer.prototype.componentFromElement = function (element) {
    if (element.type=='text') {
      return this._markdownRenderer;
    } else {
      return this._components[element.name.toLowerCase()] || defaultComponent;
    }
  }

  Renderer.prototype.renderComponent = function(elt, env, stream) {
    var component = this.componentFromElement(elt) || this._defaultComponent;
    if (component) {  
      var attrs = parseAttributes(elt, env, this._interpolator);
      component(this, elt.name, attrs, elt.children, stream);
    } 
  }

  Renderer.prototype.write = function(elt, env, stream) {
    if (!elt) {
      return;
    } else if (isArray(elt)) {
      var _this = this;
      var elements = elt;
      elements.forEach(function (elt) {
        _this.write(elt, env, stream);
      });
    } else if (isObject(elt)) {
      this.renderComponent(elt, env, stream);
    } else {
      throw new Error(`Unexpected dom element: ${JSON.stringify(elt)}`);
    }
  }

  /**
   * toHTML - Combines parsing and rendering in one easy step
   * 
   * @param {any} options
   * @param {string} input  - markdown with components
   * @param {Object} components - { componentName: function (renderer, tagName, attrs, children, stream) => writes HTML to stream, ... }
   * @param {Function} markdownEngine - function (text, stream) => writes HTML to stream
   * @param {Function} defaultComponent - function (renderer, tagName, attrs, children, stream)
   * @param {Function} interpolator - optional interpolation function (variables, expr) => value (default is standardInterpolator)
   
   * @returns {string} HTML
   */
  function toHTML({ input, components, markdownEngine, env }) {
    var renderer = new Renderer(components, markdownEngine);
    var stream = new streams.WritableStream();
    renderer.write(parse(input), env, stream);
    return stream.toString();
  }

  module.exports = { parse: parse, Renderer: Renderer, toHTML: toHTML };
})();