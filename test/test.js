var { parse, Renderer, toHTML} = require('..');
var fs = require('fs');
var expect = require('chai').expect;
var path = require('path');
var _ = require('lodash');
var { isArray } = require('util');
var MarkdownIt = require('markdown-it');
var markdown = new MarkdownIt();
var streams = require('memory-streams');

var example = fs.readFileSync(path.join(__dirname, 'complex-example.md'));

function convertNode(n) { 
  if (isArray(n)) {
    return n.map(elt=>convertNode(elt));
  } else if (n) { 
    return _.pickBy({ 
      type: n.type, 
      name: n.name, 
      children: convertNode(n.children), 
      attribs: n.attribs,
      literal: n.literal,
      data: n.data
    }, 
    _.identity); 
  } 
}

describe('component-markdown', function () {
  context('parse', function () {
    it('should return an array containing objects representing the parsed HTML tree', function () {
      var parseResult = parse(example);
      
      expect(parseResult).to.be.an('array');
      expect(parseResult.length).to.equal(5);
      
      expect(parseResult[0].type).to.equal('text');
      expect(parseResult[0].data).to.exist;

      expect(parseResult[1].type).to.equal('tag');
      expect(parseResult[1].name).to.equal('div');
      expect(parseResult[1].children.length).to.equal(1);

      expect(parseResult[2].type).to.equal('tag');
      expect(parseResult[2].name).to.equal('selfClosing');

      expect(parseResult[3].type).to.equal('text');
      
      expect(parseResult[4].type).to.equal('tag');
      expect(parseResult[4].name).to.equal('MyComponent');
      expect(parseResult[4].attribs).to.deep.equal({
        a:"1", b: "string", c:"#{x.y}"
      });
      expect(parseResult[4].children.length).to.equal(2);
    });
  });

  context('renderer', function () {
    it('should render a component', function () { 
      var renderer = new Renderer({
        components: {
          MyComponent: function (renderer, tagName, {a,b,c,d}, children, stream) {
            stream.write(`<div class="my-component">`)
            stream.write(`a=${a}:${typeof(a)}\n`);
            stream.write(`b=${b}:${typeof(b)}\n`);
            stream.write(`c=${c}:${typeof(c)}\n`);
            stream.write(`d=${d}:${typeof(d)}\n`);
            renderer.write(children)
            stream.write(`</div>`);
          }
        },
        markdownEngine: function (text, stream) {
          stream.write(markdown.render(text));
        }
      });

      var dom = parse('<MyComponent a=1 b="string" c=#{a.b} d=#{ a.b }/>');
      var stream = new streams.WritableStream();
      renderer.write(dom, {a: {b: "xyz" }}, stream);
      var result = stream.toString();

      expect(result).to.have.string('a=1:number');
      expect(result).to.have.string('b=string:string');
      expect(result).to.have.string('c=xyz:string');
      expect(result).to.have.string('d=xyz:string');
    });
  })
});