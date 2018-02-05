import Cursor from './cursor';

export default class Parser {
  parse(input) {
    this.cursor = new Cursor(input);
    return this.content();
  }

  content(closeTag) {
    const closeTest = closeTag && new RegExp(`^</${closeTag}>`, 'i');
    var elements = [];

    // returns true if we encounter closeTag
    const tryCapture = capture => {
      // check for closing tag before we capture anything:
      if (closeTag && this.cursor.capture(closeTest)){
        return true;
      } else {
        var elt = capture();
        if (elt) {
          elements.push(elt);
        }
      }
    };

    while (!this.cursor.eof) {
      if (
        tryCapture(()=>this.tag()) ||
        tryCapture(()=>this.text())
      ) {
        return elements;
      }
    }

    if (closeTag) {
      throw new Error(`Expecting closing tag </${closeTag}> at line ${this.cursor.lineNumber}`);
    }

    return elements;
  }

  tag() {
    const index = this.cursor.index;
    const tagMatch = this.cursor.capture(/^<(\/?\w+)/);
    if (tagMatch) {
      const rawName = tagMatch[1];
      const attrs = this.captureAttributes(this.cursor);
      const endBracket = this.cursor.capture(/^\s*(\/)?>/);
      const name = rawName.toLowerCase();
      const selfClosing = (endBracket[1]==='/');

      if (!endBracket) {
        throw new Error(`Missing end bracket while parsing tag '${
          this.cursor.peek(index, 10)
        }...' at line ${
          this.cursor.lineNumber
        }`);
      }

      if (name[0]==='/') {
        throw new Error(`Unexpected closing tag <${rawName}> at line ${this.cursor.lineNumber}`);
      }

      const children = selfClosing ? [] : this.content(rawName);

      return {
        type: 'tag',
        name, children, rawName, attrs, selfClosing
      };
    }
  }

  text() {
    const textElement = { type: 'text', blocks: [] };
    const captureAndStoreInterpolation = () => {
      var interpolationElement = this.cursor.capture(/^{\s*([^}]*)}/);
      if (interpolationElement) {
        textElement.blocks.push({
          type: 'interpolation',
          accessor: interpolationElement[1].trim(' ')
        });
        return true;
      }
    };
    const isEmptyTextElement = (t) => t.blocks.length===0 || (t.blocks.length===1 && /^\s*$/.test(t.blocks[0]));

    // this.cursor may start with an interpolation...
    captureAndStoreInterpolation();

    var rawText;
    while (rawText = this.captureTextUntilBreak()) {
      if (rawText.length===0) {
        break;
      }
      textElement.blocks.push(rawText);
      if (!captureAndStoreInterpolation() && this.cursor.test(/^\w/)) {
        // the next element isn't an interpolation, so must be a tag or EOF
        break;
      }
    }
    // remove whitespace-only containing blocks:
    return isEmptyTextElement(textElement) ? null : textElement;
  }

  captureTextUntilBreak() {
    var blocks = [];
    var text;
    while (text=this.cursor.capture(/^\s*([^<{}>])*/)) {
      // detect {{ << escape sequences, and non-tag angle bracket
      var escapedText = this.cursor.capture(/^({{|}}|<<|>>)/);
      if (escapedText) {
        // this is not a break, capture the character and continue...
        blocks.push(text[0] + escapedText[0][0]);
      } else {
        blocks.push(text[0]);
        return blocks.join('');
      }
    }
    return blocks.length>0 ? blocks.join('') : null;
  }

  captureAttributes() {
    const attribRE = /^\s*([^=<>"'\s]+)\s*=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|(?:{([^}]*)}))/;
    var attribs = {};
    var match;

    while (match = this.cursor.capture(attribRE)) {
      var variable = match[1];
      if (match[3]) { // string
        attribs[variable] = match[3];
      } else if (match[4]) { //number
        attribs[variable] = parseFloat(match[4]);
      } else if (match[5]) { //interpolation
        attribs[variable] = {
          type: 'interpolation',
          accessor: match[5].trim(' ')
        };
      }
    }
    return attribs;
  }
}
