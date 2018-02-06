import { toHTML } from '../src';
import { expect } from 'chai';
import { evilStreakMarkdownEngine, showdownEngine } from '../src/engines';

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

    expect(result).to.be.a('string');
    expect(result).to.have.string('a=hello:string');
    expect(result).to.have.string('a=123:number');
    expect(result).to.have.string('<h1>Heading with interpolation - hello</h1>');
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

    expect(result).to.be.a('string');
    expect(result).to.have.string('a=hello:string');
    expect(result).to.have.string('a=123:number');
    expect(result).to.have.string('<h1>Heading with interpolation - hello</h1>');
  });
});
