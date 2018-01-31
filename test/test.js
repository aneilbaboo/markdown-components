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
        a: 1, b: 'string', c: { accessor: 'x.y' }
      });
      expect(parseResult[4].children.length).to.equal(2);
    });
  });

  context('renderer', function () {
    var renderer;
    var components;
    var markdownEngine;

    beforeEach(function() {
      components =  {
        SimpleComponent: function ({__children, a}, render) {
          render(`<div class="simple-component">`);
          render(`a=${a}:${typeof(a)}\n`);
          render(__children);
          render(`</div>`);
        }
      };

      markdownEngine = function (text, render) {
        render(markdown.render(text));
      };

      renderer = new Renderer({
        components: components,
        markdownEngine: markdownEngine
      });
    });

    it('should render a float attribute', function () {
      var dom = parse('<SimpleComponent a=1.09 />');
      var stream = new streams.WritableStream();
      renderer.write(dom, {a: {b: "xyz" }}, stream);
      var result = stream.toString();

      expect(result).to.have.string('a=1.09:number');
    });

    it('should render a string attribute', function () {
      var dom = parse('<SimpleComponent a="abc" />');
      var stream = new streams.WritableStream();
      renderer.write(dom, {a: {b: "xyz" }}, stream);
      var result = stream.toString();

      expect(result).to.have.string('a=abc:string');
    });

    it('should render an interpolated attribute', function () {
      var dom = parse('<SimpleComponent a=#{x.y} />');
      var stream = new streams.WritableStream();
      renderer.write(dom, {x: {y: "xyz" }}, stream);
      var result = stream.toString();

      expect(result).to.have.string('a=xyz:string');
    });

    it('should render an interpolated attribute, ignoring spaces', function () {
      var dom = parse('<SimpleComponent a=#{ x.y } />');
      var stream = new streams.WritableStream();
      renderer.write(dom, {x: {y: "xyz" }}, stream);
      var result = stream.toString();
      
      expect(result).to.have.string('a=xyz:string');
    });
    
    it('should render subcomponents', function () {
      var dom = parse(
        '<SimpleComponent a=#{ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>'
      );
      var stream = new streams.WritableStream();
      renderer.write(dom, {x: {y: "xyz" }}, stream);
      var result = stream.toString();

      expect(result).to.have.string('a=xyz:string');      
    });
    
    it('should render markdown inside a component', function () {
      var dom = parse(
        '<SimpleComponent>\n' +
        '# heading\n' +
        '* listItem1\n' +
        '* listItem2\n' +
        '</SimpleComponent>'
      );
      var stream = new streams.WritableStream();
      renderer.write(dom, {}, stream);
      var result = stream.toString();

      expect(result).to.have.string('<div class="simple-component">');
      expect(result).to.have.string('<h1>heading</h1>');
      expect(result).to.have.string('<li>listItem1</li>');
      expect(result).to.have.string('<li>listItem2</li>');
      expect(result).to.have.string('</div>');
    });

    context('toHTML', function () {
      it('should create HTML in one step', function () {
        
        var result = toHTML({
          input: ('<SimpleComponent a=#{ x.y }>\n' +
          '  <SimpleComponent a=123>\n' +
          '  </SimpleComponent>\n' +
          '</SimpleComponent>'),
          components: components,
          markdownEngine: markdownEngine,
          context: { x: { y: "hello" }}
        });

        expect(result).to.be.a('string');
        expect(result).to.have.string('a=hello:string');
        expect(result).to.have.string('a=123:number');
      });
    });

    it('should render a component with multiple variables', function () { 
      var renderer = new Renderer({
        components: {
          MyComponent: function ({__children, a,b,c,d}, render) {
            render(`<div class="my-component">`)
            render(`a=${a}:${typeof(a)}\n`);
            render(`b=${b}:${typeof(b)}\n`);
            render(`c=${c}:${typeof(c)}\n`);
            render(`d=${d}:${typeof(d)}\n`);
            render(__children)
            render(`</div>`);
          }
        },
        markdownEngine: function (text, render) {
          render(markdown.render(text));
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
  });
});