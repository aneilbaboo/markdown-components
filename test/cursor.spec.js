import Cursor from '../src/cursor';
import { expect } from 'chai';

describe('Cursor', function () {
  context('constructor', function () {
    it('should accept a string', function () {
      expect(new Cursor('abc')).to.be.an('object');
    });

    it('should accept a string and an index', function () {
      var cursor = new Cursor('abc', 2);
      expect(cursor).to.be.an('object');
      expect(cursor.index).to.equal(2);
    });
  });

  context('#peek', function () {
    it('should show one character at the current index', function () {
      var cursor = new Cursor('abcdefghijk', 4);
      expect(cursor.peek()).to.equal('e');
    });

    it('should show several characters at the current index', function () {
      var cursor = new Cursor('abcdefghijk', 4);
      expect(cursor.peek(3)).to.equal('efg');
    });

    it('should show a specified number of characters at the current index', function () {
      var cursor = new Cursor('abcdefghijk', 4);
      expect(cursor.peek(3)).to.equal('efg');
    });

    it('should show a specified number of characters at an offset from the current index', function () {
      var cursor = new Cursor('abcdefghijk', 4);
      expect(cursor.peek(3, -1)).to.equal('def');
    });
  });

  context('#test', function () {
    it('should return true if the regex matches current input position', function () {
      var cursor = new Cursor('abcdefg');
      expect(cursor.test(/abc/)).to.be.true;
      expect(cursor.test(/def/)).to.be.true;
    });

    it('should return false if the regex does not match text from the current input position', function () {
      var cursor = new Cursor('abcdefg', 3);
      expect(cursor.test(/abc/)).to.be.false;
    });
  });

  context('#capture', function () {
    it('should return the match and advance the index after a successful match', function () {
      var cursor = new Cursor('abcdefg');
      var capture = cursor.capture(/b(.*)e/);
      expect(capture).to.be.ok;
      expect(capture[0]).to.equal('bcde');
      expect(cursor.index).to.equal(5);
      expect(cursor.peek()).to.equal('f');
    });

    it('should return null and not advance the index after an unsuccesful match', function () {
      var cursor = new Cursor('abcdefg', 3);
      var capture = cursor.capture(/b(.*)e/);

      expect(capture).to.be.null;
    });
  });

  context('#seek', function () {
    it('should reset the index to 0 when no args are given', function () {
      var cursor = new Cursor('abcdefg', 5);
      cursor.seek();
      expect(cursor.index).to.equal(0);
    });

    it('should set the index to the provided value', function () {
      var cursor = new Cursor('abcdefg');
      cursor.seek(3);
      expect(cursor.index).to.equal(3);
    });
  });

  context('#eof', function () {
    it('should be true when index before the end of the input', function () {
      var cursor = new Cursor('abcdefg');
      cursor.seek(6);
      expect(cursor.eof).to.be.false;
    });

    it('should be false when index at the end of the input', function () {
      var cursor = new Cursor('abcdefg');
      cursor.seek(7);
      expect(cursor.eof).to.be.true;
    });


    it('should be false when index is beyond the end of the input', function () {
      var cursor = new Cursor('abcdefg');
      cursor.seek(8);
      expect(cursor.eof).to.be.true;
    });
  });

  context('#next', function () {
    it('should return the next character', function () {
      var cursor = new Cursor('abcdefg');
      expect(cursor.next()).to.equal('a');
      expect(cursor.next()).to.equal('b');
      expect(cursor.next()).to.equal('c');
    });

    it('should return the next n characters', function () {
      var cursor = new Cursor('abcdefg');
      expect(cursor.next(3)).to.equal('abc');
      expect(cursor.next(3)).to.equal('def');
    });

    it('should return null when index is at the end of input', function () {
      var cursor = new Cursor('abcdefg');
      cursor.seek(7);
      expect(cursor.next(3)).to.be.null;
    });
  });
});
