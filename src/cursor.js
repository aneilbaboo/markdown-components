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
  test(re) {
    return re.test(this._buffer.slice(this._index));
  }

  /**
   * capture - advances the cursor to the next character if of a sequence
   *            matching a regex, returning the match or null
   *
   * @param {RE2} re
   * @returns {Object?} match
   * @memberof Cursor
   */
  capture(re) {
    var match = re.exec(this._buffer.slice(this._index));
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
}
