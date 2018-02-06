import { Parser, Renderer } from '../src';
import { expect } from 'chai';
import _ from 'lodash';
import streams from 'memory-streams';
import { markdownItEngine } from '../src/engines';

describe('Renderer', function () {
  var components;
  var parse;

  context('write', function () {

    beforeEach(function() {
      var parser = new Parser({ markdownEngine: markdownItEngine() });
      parse = input => parser.parse(input);
      components =  {
        SimpleComponent: function ({ __children, a }, render) {
          render('<div class="simple-component">');
          render(`a=${a}:${ typeof a }\n`);
          render(__children);
          render('</div>');
        }
      };
    });

    it('should render a float attribute', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse('<SimpleComponent a=1.09 />');
      const stream = new streams.WritableStream();
      renderer.write(dom, { a: { b: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=1.09:number');
    });

    it('should render a string attribute', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse('<SimpleComponent a="abc" />');
      const stream = new streams.WritableStream();
      renderer.write(dom, { a: { b: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=abc:string');
    });

    it('should render an interpolated attribute', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse('<SimpleComponent a={x.y} />');
      const stream = new streams.WritableStream();
      renderer.write(dom, { x: { y: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=xyz:string');
    });

    it('should render an interpolated attribute, ignoring spaces', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse('<SimpleComponent a={ x.y } />');
      const stream = new streams.WritableStream();
      renderer.write(dom, { x: { y: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=xyz:string');
    });

    it('should render subcomponents', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse(
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>'
      );
      const stream = new streams.WritableStream();
      renderer.write(dom, { x: { y: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=xyz:string');
    });

    it('should render markdown inside a component', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse(
        '<SimpleComponent>\n' +
        '# heading\n' +
        '* listItem1\n' +
        '* listItem2\n' +
        '</SimpleComponent>'
      );
      const stream = new streams.WritableStream();
      renderer.write(dom, {}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('<div class="simple-component">');
      expect(result).to.have.string('<h1>heading</h1>');
      expect(result).to.have.string('<li>listItem1</li>');
      expect(result).to.have.string('<li>listItem2</li>');
      expect(result).to.have.string('</div>');
    });

    it('should interpolate curly brace expressions inside markdown', function () {
      const renderer = new Renderer({
        components: components
      });
      const dom = parse(
        '<SimpleComponent>\n' +
        "# { user.name }'s Settings\n" +
        '* setting1\n' +
        '* setting2\n' +
        '</SimpleComponent>'
      );
      const stream = new streams.WritableStream();
      renderer.write(dom, { user: { name: 'Bob' }}, stream);
      const result  = stream.toString();
      expect(result).to.contain("<h1>Bob's Settings</h1>");
    });

    it('should throw an error if an invalid object is provided', function () {
      const renderer = new Renderer({
        components: components
      });
      const stream = new streams.WritableStream();
      class X {};
      expect(()=>renderer.write(1, {}, stream)).to.throw();
      expect(()=>renderer.write(new X(), {}, stream)).to.throw();
    });

    it('should render a component with multiple variables', function () {
      var renderer = new Renderer({
        components: {
          MyComponent: function ({ __children, a,b,c,d }, render) {
            render('<div class="my-component">');
            render(`a=${a}:${typeof a}\n`);
            render(`b=${b}:${typeof b}\n`);
            render(`c=${c}:${typeof c}\n`);
            render(`d=${d}:${typeof d}\n`);
            render(__children);
            render('</div>');
          }
        }
      });

      const dom = parse('<MyComponent a=1 b="string" c={a.b} d={ a.b }/>');
      const stream = new streams.WritableStream();
      renderer.write(dom, { a: { b: 'xyz' }}, stream);
      const result  = stream.toString();

      expect(result).to.have.string('a=1:number');
      expect(result).to.have.string('b=string:string');
      expect(result).to.have.string('c=xyz:string');
      expect(result).to.have.string('d=xyz:string');
    });

    context('when an unrecognized component is present', function () {
      it('and defaultComponent is provided,', function () {
        const renderer = new Renderer({
          components: components,
          defaultComponent(attrs, render) {
            render('<div class="default">');
            render(`a=>${attrs.a};b=>${attrs.b};c=>${attrs.c}`);
            render('</div>');
          }
        });
        const stream = new streams.WritableStream();
        const dom = parse('<default a=123 b="hello" c={val}></default>');
        renderer.write(dom, { val: 'myval' }, stream);
        const result = stream.toString();

        expect(result).to.equal(
          '<div class="default">'+
          'a=>123;b=>hello;c=>myval'+
          '</div>'
        );
      });

      it('and defaultComponent is not provided,', function () {
        const renderer = new Renderer({
          components: components
        });
        const dom = parse('<default a=123 b="hello" c={val}></default>');
        expect(()=>renderer.write(dom, { val: 'myval' })).to.throw();
      });
    });

  });
});
