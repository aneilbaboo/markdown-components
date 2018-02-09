export default class Cursor {
  constructor(input, index=0) {
    this._index = index;
    this._buffer = new Buffer(input);
  }

  /**
   * index - current location of the cursor from the start
   *
   * @readonly
   * @memberof Cursor
   */
  get index() {
    return this._index;
  }

  /**
   * peek - returns a new string of the given length representing the buffer at
   *        the current index and offset.
   *
   * @param {number} [length=1]
   * @param {number} [offset=0]
   * @returns {Buffer} result
   * @memberof Cursor
   */
  peek(length=1, offset=0) {
    return this._buffer.slice(this._index + offset, this._index + length + offset).toString();
  }

  /**
   * test - tests whether text at the current input matches the regex
   *
   * @param {RE2} re
   * @returns {boolean} success
   * @memberof Cursor
   */
  test(re, offset=0) {
    return !this.eof && re.test(this._buffer.slice(this._index + offset));
  }

  /**
   * capture - advances the cursor to the next character if of a sequence
   *            matching a regex, returning the match or null
   *
   * @param {RE2} re
   * @returns {Object?} match
   * @memberof Cursor
   */
  capture(re, offset=0) {
    var match = this.eof ? null : re.exec(this._buffer.slice(this._index + offset));
    if (match) {
      this._index += match[0].length + match.index;
    }
    return match;
  }

  /**
   * seek - positions the cursor at the absolute index provided.
   *        if no argument is provided, effectively resets the cursor.
   * @param {number} [index=0]
   * @memberof Cursor
   */
  seek(index=0) {
    this._index = index;
  }

  /**
   * eos - end of string
   *
   * @memberof Cursor
   */
  get eof() {
    return this._index >= this._buffer.length;
  }

  /**
   * next - creates and returns a new string object of length n at the current index
   *
   * @memberof Cursor
   */
  next(n=1) {
    if (!this.eof) {
      var result = this._buffer.slice(this._index, this._index + n).toString();
      this._index += n;
      return result;
    } else {
      return null;
    }
  }

  lineIndex(lineNumber) {
    const lines = this._buffer.toString().split('\n');
    const selectedLines = lines.slice(0, lineNumber-1);
    var total = 0;
    if (lineNumber<1 || lineNumber>lines.length) {
      throw new Error(`Line number out of range ${lineNumber}`);
    }
    selectedLines.forEach(line=> {
      total += line.length + 1;
    });
    return total;
  }

  get lines() {
    var stringToCurrentIndex = this._buffer.slice(0, this._index).toString();
    return stringToCurrentIndex.split(/\r\n|\r|\n/);
  }

  get lineNumber() {
    return this.lines.length;
  }

  get columnNumber() {
    const lastLine = this.lines[this.lineNumber-1];
    return lastLine ? lastLine.length + 1 : 1;
  }
}
