import { evaluate } from '../src/evaluator';

describe('evaluator', function () {
  it('should evaluate a scalar', function () {
    expect(evaluate(['scalar', 'abc'], {}, {})).toEqual('abc');
    expect(evaluate(['scalar', 123], {}, {})).toEqual(123);
    expect(evaluate(['scalar', true], {}, {})).toEqual(true);
    expect(evaluate(['scalar', false], {}, {})).toEqual(false);
  });

  it('should evaluate a variable', function () {
    expect(evaluate(['accessor', 'a'], { a: 1 }, {})).toEqual(1);
    expect(evaluate(['accessor', 'a.b'], { a: { b: 123 }}, {})).toEqual(123);
  });

  it('should evaluate a missing variable as undefined', function () {
    expect(evaluate(['accessor', 'b'], { a: 1 }, {})).toBeUndefined();
    expect(evaluate(['accessor', 'a.b.c'], {}, {})).toBeUndefined();
  });

  it('should evaluate a function call with scalar arguments', function () {
    expect(evaluate(['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]], {}, {
      mul(ctx, x, y) {
        return x * y;
      }
    })).toEqual(6);
  });

  it('should evaluate a function call with scalar, accessor arguments', function () {
    expect(evaluate(['funcall', 'mul', {}, ['scalar', 2], ['accessor', 'a.b']], {
      a: { b: 3 }
    }, {
      mul(ctx, x, y) {
        return x * y;
      }
    })).toEqual(6);
  });

  it('should evaluate a function call with funcall and scalar arguments', function () {
    expect(evaluate(['funcall', 'mul', {},
    ['scalar', 2],
    ['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]]], {}, {
      mul(ctx, x, y) {
        return x * y;
      }
    })).toEqual(12);
  });

  it('should throw an error if the function is not defined', function () {
    expect(() => evaluate(['funcall', 'mul',
      { lineNumber: 5, columnNumber: 7 },
      ['scalar', 2],
      ['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]]], {}, {})
    ).toThrow(/Function not defined \(mul\).*5.*7/);
  });

  it('should evaluate and logic correctly', function () {
    expect(evaluate(['and', ['scalar', true], ['scalar', true]])).toEqual(true);
    expect(evaluate(['and', ['scalar', true], ['scalar', false]])).toEqual(false);
    expect(evaluate(['and', ['scalar', false], ['scalar', true]])).toEqual(false);
    expect(evaluate(['and', ['scalar', false], ['scalar', false]])).toEqual(false);
  });

  it('should evaluate or logic correctly', function () {
    expect(evaluate(['or', ['scalar', true], ['scalar', true]])).toEqual(true);
    expect(evaluate(['or', ['scalar', true], ['scalar', false]])).toEqual(true);
    expect(evaluate(['or', ['scalar', false], ['scalar', true]])).toEqual(true);
    expect(evaluate(['or', ['scalar', false], ['scalar', false]])).toEqual(false);
  });

  it('should evaluate not logic correctly', function () {
    expect(evaluate(['not', ['scalar', true]])).toEqual(false);
    expect(evaluate(['not', ['scalar', false]])).toEqual(true);
  });
});
