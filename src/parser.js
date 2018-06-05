import Cursor from './cursor';
import streams from 'memory-streams';
import { isFunction } from 'lodash';
import { error, ErrorType } from './error';
import { OpType } from './evaluator';

export const DEFAULT_INTERPOLATION_POINT = '=interpolation-point=';
export const ATTRIBUTE_RE = /^\s*([^/=<>"'\s]+)\s*(?:=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|((?=\{))|(true|false)))?/;

export default class Parser {
  constructor({ markdownEngine, interpolationPoint, indentedMarkdown }) {
    if (!isFunction(markdownEngine)) {
      throw new Error('Invalid markdownEngine');
    }
    this._markdownEngine = markdownEngine;
    this._interpolationPoint = interpolationPoint || DEFAULT_INTERPOLATION_POINT;
    this._indentedMarkdown = indentedMarkdown;
}

  parse(input) {
    this.cursor = new Cursor(input);
    return this.content();
  }

  // returns true if a close is encountered
  captureContentUntil(capture, closeTest, elements) {
    // check for closing tag before we capture anything:
    if (closeTest && this.cursor.capture(closeTest)){
      return true;
    } else {
      var elt = capture();
      if (elt) {
        elements.push(elt);
      }
    }
  }

  content(closeTag) {
    const closeTest = closeTag && new RegExp(`^</${closeTag}>`, 'i');
    var elements = [];

    while (!this.cursor.eof) {
      if (
        this.captureContentUntil(()=>this.tag(), closeTest, elements) ||
        this.captureContentUntil(()=>this.text(), closeTest, elements)
      ) {
        return elements;
      }
    }

    if (closeTag) {
      error(`Expecting closing tag </${closeTag}>`, this.cursor, ErrorType.NoClosingTag);
    }

    return elements;
  }

  tag() {
    const tagMatch = this.cursor.capture(/^<(\/?\w+)/);
    if (tagMatch) {
      const rawName = tagMatch[1];
      const attrs = this.captureAttributes(this.cursor);
      const endBracket = this.cursor.capture(/^\s*(\/)?>/);
      const name = rawName.toLowerCase();

      if (!endBracket) {
        error(`Missing end bracket while parsing '<${rawName} ...'`, this.cursor, ErrorType.MissingEndBracket);
      }

      if (name[0]==='/') {
        error(`Unexpected closing tag <${rawName}>`, this.cursor, ErrorType.UnexpectedClosingTag);
      }

      const selfClosing = (endBracket[1]==='/');
      const children = selfClosing ? [] : this.content(rawName);

      return {
        type: 'tag',
        name, children, rawName, attrs, selfClosing
      };
    }
  }

  text() {
    const [textBlocks, interpolationElements] = this.captureTextAndInterpolations();
    const renderedTextBlocks = this.renderMarkdownBlocks(textBlocks);
    const blocks = this.zipTextAndInterpolation(renderedTextBlocks, interpolationElements);

    if (blocks.length>0) {
      return {
        type: 'text',
        blocks: blocks,
      };
    }
  }

  zipTextAndInterpolation(textBlocks, interpolationElements) {
    const blocks = [];
    var i=0;
    while (textBlocks.length>i || interpolationElements>i) {
      const [text, interpolation] = [textBlocks[i], interpolationElements[i]];
      if (text && text.length>0) {
        blocks.push(text);
      }
      if (interpolation) {
        blocks.push(interpolation);
      }
      i++;
    }
    // remove empty text elements before returning
    return blocks.filter(block=>block!=='');
  }

  //
  // Markdown block parser
  //
  renderMarkdownBlocks(textBlocks) {
    const textWithInterpolationPoints = textBlocks.join('');
    const stream = new streams.WritableStream();
    const render = htmlText => stream.write(htmlText);
    this._markdownEngine(textWithInterpolationPoints, render);
    const processedTextWithInterpolationPoints = stream.toString();
    const processedTextBlocks = processedTextWithInterpolationPoints.split(this._interpolationPoint);
    return processedTextBlocks;
  }

  removeIndent(text) {
    const textBlockLines = text.split('\n');
    var [startLine, firstIndent] = this.findFirstIndentedLine(textBlockLines);

    var resultLines = [];
    for (let lineIndex=startLine; lineIndex<textBlockLines.length; lineIndex++) {
      let line = textBlockLines[lineIndex];
      let lineIndent = getIndent(line);
      if (lineIndent) {
        if (lineIndent >= firstIndent) {
          resultLines.push(line.slice(firstIndent));
        } else {
          // found a dedent - forbidden!
          // position cursor at the location where problem was detected
          let cursor = this.cursor;
          let lineNumber = startLine+lineIndex+1; // lineNumber is 1-indexed, so add 1
          cursor.seek(cursor.lineIndex(lineNumber)+lineIndent);
          error('Bad indentation in text block', cursor, ErrorType.BadIndentation);
        }
      }
    }
    return resultLines.join('\n');
  }

  findFirstIndentedLine(textBlockLines) {
    var firstIndent;
    var startLine;
    for (startLine=0; startLine<textBlockLines.length; startLine++) {
      firstIndent = getIndent(textBlockLines[startLine]);
      if (firstIndent) {
        break;
      }
    }
    return [startLine, firstIndent];
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

    return blocks.join('');
  }

  captureAttributes() {
    var attribs = {};
    var match;

    while (match = this.cursor.capture(ATTRIBUTE_RE)) {
      var variable = match[1];
      if (match[3]) { // string
        attribs[variable] = match[3];
      } else if (match[4]) { // number
        attribs[variable] = parseFloat(match[4]);
      } else if (match[5] === ''){ // interpolation start
        attribs[variable] = this.captureInterpolation();
      } else if (match[6]) {
        attribs[variable] = match[6]==='true' ? true : false;
      } else { // must be boolean true
        attribs[variable] = true;
      }
    }
    return attribs;
  }

  //
  // Text and Interpolations
  //
  captureTextAndInterpolations() {
    const interpolationElements = [];
    const textBlocks = [];
    const captureAndStoreInterpolation = () => {
      const interpolation = this.captureInterpolation();
      if (interpolation) {
        interpolationElements.push(interpolation);
        textBlocks.push(this._interpolationPoint);
      }
      return true;
    };

    // this.cursor may start with an interpolation...
    captureAndStoreInterpolation();

    var rawText;
    var startLine = this.cursor.lineNumber;
    while (rawText = this.captureTextUntilBreak()) {
      if (this._indentedMarkdown) {
        // if parser allows indented markdown, remove the indent:
        textBlocks.push(this.removeIndent(rawText, startLine));
      } else {
        textBlocks.push(rawText);
      }
      captureAndStoreInterpolation();
      startLine = this.cursor.lineNumber;
    }

    return [textBlocks, interpolationElements];
  }

  //
  // Interpolation Parsing
  //
  captureInterpolation() {
    if (this.cursor.capture(/^\s*\{/)) {
      const result = {
        type: 'interpolation',
        expression: this.captureInterpolationExpression(/^\s*((?=\}))/)
      };
      this.cursor.capture(/^\s*\}/); // consume the final }
      return result;
    }
  }

  captureInterpolationExpression(terminator) {
    let lhs;
    while (!this.cursor.capture(terminator)) {
      this.cursor.capture(/^\s*/);
      lhs = this.captureInterpolationTerm(lhs, terminator);
    }
    return lhs;
  }

  captureInterpolationTerm(lhs, terminator) {
    const expressionMatch = this.cursor.capture(
      /^\s*(and\b|or\b)|(not\b)|(\()|([a-zA-Z][.\w]*)\s*(\()?|(\"[^\"]*\"|\'[^\']*\'|true|false|[+-]?(?:[0-9]*[.])?[0-9]+)/i
    );
    const capture = expressionMatch && expressionMatch[0].trim(' ');
    if (expressionMatch[1]) { // binary operator
      return this.captureInterpolationBinaryOperator(expressionMatch[1], lhs, terminator);
    } else if (lhs) {
      error(`Expecting "and" or "or" but received "${capture}"`, this.cursor, ErrorType.UnexpectedExpression);
    } else if (expressionMatch[4]) {
      return this.captureSymbolExpression(expressionMatch);
    } else if (expressionMatch[6]) { // scalar
      return this.captureScalarExpression(expressionMatch);
    } else if (expressionMatch[2]) { // not
      return this.captureInterpolationUnaryOperator(expressionMatch[2]);
    } else if (expressionMatch[3]) { // group start: ( ...
      return this.captureInterpolationGroup();
    }
    error('Invalid expression', this.cursor, ErrorType.InvalidExpression);
  }

  captureSymbolExpression(expressionMatch) {
    const symbol = expressionMatch[4];
    if (expressionMatch[5]) { // funcall
      const location = { lineNumber: this.cursor.lineNumber, columnNumber: this.cursor.columnNumber };
      return [OpType.funcall, symbol, location, ...this.captureInterpolationFunctionArguments(symbol)];
    } else { // value
      return [OpType.accessor, symbol];
    }
  }

  captureScalarExpression(expressionMatch) {
    try {
      return [OpType.scalar, JSON.parse(expressionMatch[6])];
    } catch (e) {
      error(`Invalid expression ${expressionMatch[6]}`, this.cursor, ErrorType.InvalidExpression);
    }
  }

  captureInterpolationBinaryOperator(binOp, lhs, terminator) {
    if (!lhs) {
      error(`Unexpected operator ${expressionMatch[1]}`, this.cursor, ErrorType.UnexpectedOperator);
    } else {
      return [binOp, lhs, this.captureInterpolationExpression(terminator)];
    }
  }

  captureInterpolationUnaryOperator(op, terminator) {
    return [op, this.captureInterpolationTerm(null, terminator)];
  }

  captureInterpolationGroup() {
    return this.captureInterpolationExpression(/^\s*\)/);
  }

  captureInterpolationFunctionArguments(symbol) {
    const args = [];
    if (!this.cursor.capture(/^\s*\)/)) {
      while (true) {
        const arg = this.captureInterpolationExpression(/^\s*((?=\,|\)))/);
        if (arg) {
          args.push(arg);
        } else {
          error(`Invalid argument to ${symbol}`, this.cursor, 'InvalidArgument');
        }
        const argNextMatch = this.cursor.capture(/^\s*(\)|\,)/);
        if (!argNextMatch) {
          error(`Expecting , or ) in call to ${symbol}`, this.cursor, 'InvalidArgument');
        } else if (argNextMatch[1]) { // closing paren )
          break;
        } // else found comma - continue processing args
      }
    }
    return args;
  }
}

function getIndent(line) {
  const indentRE = /^(\s*)[^\s]/;
  const indentMatch = indentRE.exec(line);
  return indentMatch && indentMatch[1].length;
}
