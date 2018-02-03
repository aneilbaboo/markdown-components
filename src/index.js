import streams from 'memory-streams';
import Renderer from './renderer';
import parse from './parser';

export { Renderer, parse };

/**
 * toHTML - Combines parsing and rendering in one easy step
 *
 * @param {any} options
 * @param {string} options.input  - markdown with components
 * @param {Object} options.components - { componentName: function ({__name, __children, ...props}, render)
 *                                    => use render method to write to stream
 * @param {Function} options.markdownEngine - function (text, render) => writes HTML using render method
 * @param {Function} options.defaultComponent - function ({__name, __children, ...props}, render)
 * @param {Function} options.interpolator - optional interpolation function (variables, expr)
 *                                      => value (default is standardInterpolator)

  * @returns {string} HTML
  */
export function toHTML({ input, components, markdownEngine, context }) {
  var renderer = new Renderer({
    components: components,
    markdownEngine: markdownEngine
  });
  var stream = new streams.WritableStream();
  renderer.write(parse(input), context, stream);
  return stream.toString();
}
