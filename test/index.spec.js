import { toHTML } from '../src';
import MarkdownIt from 'markdown-it';
import { expect } from 'chai';
const markdown = new MarkdownIt();

describe('toHTML', function() {
  it('should create HTML in one step', function() {
    const components = {
      SimpleComponent: function({ __children, a }, render) {
        render('<div class="simple-component">');
        render(`a=${a}:${typeof a}\n`);
        render(__children);
        render('</div>');
      }
    };

    const markdownEngine = function(text, render) {
      render(markdown.render(text));
    };

    var result = toHTML({
      input:
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>',
      components: components,
      markdownEngine: markdownEngine,
      context: { x: { y: 'hello' } }
    });

    expect(result).to.be.a('string');
    expect(result).to.have.string('a=hello:string');
    expect(result).to.have.string('a=123:number');
  });
});
