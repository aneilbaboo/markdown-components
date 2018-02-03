import parse from '../src/parser';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

const example = fs.readFileSync(path.join(__dirname, 'complex-example.md'));

describe('parser', function () {
  it('should parse a text block', function () {
    var elements = parse('Some text');
    expect(elements).to.be.an('array');
    expect(elements.length).to.equal(1);
    expect(elements[0].type).to.equal('text');
    expect(elements[0].blocks).to.deep.equal(['Some text']);
  });

  /* eslint-disable max-statements */
  it('should return an array containing objects representing the parsed HTML tree', function () {
    var parseResult = parse(example);

    expect(parseResult).to.be.an('array');
    expect(parseResult.length).to.equal(5);

    expect(parseResult[0].type).to.equal('text');
    expect(parseResult[0].blocks).to.deep.equal([
      '# heading1\nText after and interpolation ',
      { type: 'interpolation', accessor: 'x.y' },
      ' heading1\n'
    ]);

    expect(parseResult[1].type).to.equal('tag');
    expect(parseResult[1].name).to.equal('div');
    expect(parseResult[1].children.length).to.equal(1);

    expect(parseResult[2].type).to.equal('tag');
    expect(parseResult[2].name).to.equal('selfclosing');

    expect(parseResult[3].type).to.equal('text');

    expect(parseResult[4].type).to.equal('tag');
    expect(parseResult[4].name).to.equal('mycomponent');
    expect(parseResult[4].attrs).to.deep.equal({
      a: 1, b: 'string', c: { type: 'interpolation', accessor: 'x.y' }
    });
    expect(parseResult[4].children.length).to.equal(2);
  });
  /* eslint-enable */
});
