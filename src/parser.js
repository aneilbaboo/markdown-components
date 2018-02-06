import Cursor from './cursor';
import crypto from 'crypto';
import streams from 'memory-streams';
import { isFunction } from 'lodash';
import error from './error';

export default class Parser {
  constructor({ markdownEngine, interpolationPoint, indentedMarkdown=true }) {
    if (!isFunction(markdownEngine)) {
      throw new Error('Invalid markdownEngine');
    }
    this._markdownEngine = markdownEngine;
    this._interpolationPoint = interpolationPoint || crypto.randomBytes(32).toString('hex');
    this._indentedMarkdown = indentedMarkdown;
}

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
      error(`Expecting closing tag </${closeTag}>`, this.cursor, 'noClosingTag');
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
        error(`Missing end bracket while parsing '<${
          rawName
        } ...'`, this.cursor, 'missingBracket');
      }

      if (name[0]==='/') {
        error(
          `Unexpected closing tag <${rawName}>`,
          this.cursor,
          'unexpectedClosingTag'
        );
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

  renderMarkdownBlocks(textBlocks) {
    const textWithInterpolationPoints = textBlocks.join('');
    const stream = new streams.WritableStream();
    const render = htmlText => stream.write(htmlText);
    this._markdownEngine(textWithInterpolationPoints, render);
    const processedTextWithInterpolationPoints = stream.toString();
    const processedTextBlocks = processedTextWithInterpolationPoints.split(this._interpolationPoint);
    return processedTextBlocks;
  }

  captureTextAndInterpolations() {
    const interpolationElements = [];
    const textBlocks = [];
    const captureAndStoreInterpolation = () => {
      var interpolationElement = this.cursor.capture(/^{\s*([^}]*)}/);
      if (interpolationElement) {
        interpolationElements.push({
          type: 'interpolation',
          accessor: interpolationElement[1].trim(' ')
        });
        textBlocks.push(this._interpolationPoint);
        return true;
      }
    };

    // this.cursor may start with an interpolation...
    captureAndStoreInterpolation();

    var rawText;
    while (rawText = this.captureTextUntilBreak()) {
      textBlocks.push(rawText);
      captureAndStoreInterpolation();
    }

    return [textBlocks, interpolationElements];
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
    const attribRE = /^\s*([^=<>"'\s]+)\s*=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|(?:{([^}]*)}))/;
    var attribs = {};
    var match;

    while (match = this.cursor.capture(attribRE)) {
      var variable = match[1];
      if (match[3]) { // string
        attribs[variable] = match[3];
      } else if (match[4]) { // number
        attribs[variable] = parseFloat(match[4]);
      } else { // at this point it must be interpolation
        attribs[variable] = {
          type: 'interpolation',
          accessor: match[5].trim(' ')
        };
      }
    }
    return attribs;
  }
}

