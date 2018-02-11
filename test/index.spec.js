import { toHTML } from '../src';
import { evilStreakMarkdownEngine, showdownEngine } from '../src/engines';
import toBeType from 'jest-tobetype';
expect.extend(toBeType);

describe('toHTML', function() {
  const components = {
    SimpleComponent: function({ __children, a }, render) {
      render('<div class="simple-component">');
      render(`a=${a}:${typeof a}\n`);
      render(__children);
      render('</div>');
    }
  };

  it('should create HTML in one step with evilStreakEngine', function() {
    var result = toHTML({
      input:
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '# Heading with interpolation - { x.y }\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>',
      components: components,
      markdownEngine: evilStreakMarkdownEngine(),
      context: { x: { y: 'hello' }}
    });

    expect(result).toBeType('string');
    expect(result).toEqual(expect.stringContaining('a=hello:string'));
    expect(result).toEqual(expect.stringContaining('a=123:number'));
    expect(result).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
  });

  it('should create HTML in one step with showdownEngine', function () {
    var result = toHTML({
      input:
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '# Heading with interpolation - { x.y }\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>',
      components: components,
      markdownEngine: showdownEngine(),
      context: { x: { y: 'hello' }}
    });

    expect(result).toBeType('string');
    expect(result).toEqual(expect.stringContaining('a=hello:string'));
    expect(result).toEqual(expect.stringContaining('a=123:number'));
    expect(result).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
  });
});
