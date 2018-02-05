import Parser from '../src/parser';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';


describe('Parser', function () {
  var parse;
  beforeEach(function () {
    var parser = new Parser();
    parse = function (text) {
      return parser.parse(text);
    };
  });

  it('should parse a text block', function () {
    var elements = parse('Some text');
    expect(elements).to.be.an('array');
    expect(elements.length).to.equal(1);
    expect(elements[0].type).to.equal('text');
    expect(elements[0].blocks).to.deep.equal(['Some text']);
  });

  it('should parse recursive tags', function () {
    var elements = parse('<Outer a={ x.y }>\n' +
      '  <Inner a=123>\n' +
      '  </Inner>\n' +
      '</Outer>');
    expect(elements).to.be.an('array');
    expect(elements.length).to.equal(1);
    expect(elements[0].type).to.equal('tag');
    expect(elements[0].name).to.equal('outer');
    expect(elements[0].children.length).to.equal(1);
    expect(elements[0].children[0].name).to.equal('inner');
  });

  context('with complex input', function () {
    var parseResult;
    beforeEach(function () {
      const example = fs.readFileSync(path.join(__dirname, 'example.md'));
      parseResult = parse(example);
    });

    it('should return an array containing objects representing the parsed HTML tree', function () {
      expect(parseResult).to.be.an('array');
      expect(parseResult.length).to.equal(5);
    });

    it('should interpolate into markdown', function () {
      expect(parseResult[0].type).to.equal('text');
      expect(parseResult[0].blocks).to.deep.equal([
        '# heading1\nText after and interpolation ',
        { type: 'interpolation', accessor: 'x.y' },
        ' heading1\n'
      ]);
    });

    it('should parse a tag within markdown', function () {
      expect(parseResult[1].type).to.equal('tag');
      expect(parseResult[1].name).to.equal('div');
      expect(parseResult[1].children.length).to.equal(1);
    });

    it('should parse a self closing tag', function () {
      expect(parseResult[2].type).to.equal('tag');
      expect(parseResult[2].name).to.equal('selfclosing');
    });

    it('should parse number, string and interpolated attributes from a component', function () {
      expect(parseResult[4].type).to.equal('tag');
      expect(parseResult[4].name).to.equal('mycomponent');
      expect(parseResult[4].attrs).to.deep.equal({
        a: 1, b: 'string', c: { type: 'interpolation', accessor: 'x.y' }
      });
      expect(parseResult[4].children.length).to.equal(2);
    });

    it('should handle curly and angle escapes', function () {
      expect(parseResult[4].children[0]).to.deep.equal({
        type: 'text',
        blocks: [
          '\nText inside MyComponent\n' +
          'With escaped chars: { < } >\n' +
          '* listElt1\n' +
          '* listElt2\n'
        ]
      });
      expect(parseResult[4].children[1].type).to.equal('tag');
      expect(parseResult[4].children[1].name).to.equal('subcomponent');
    });
  });
  /* eslint-enable */
});
