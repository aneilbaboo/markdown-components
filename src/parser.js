import Cursor from './cursor';

export default function parse(input) {
  var cursor = new Cursor(input);
  return content(cursor);
}

export function content(cursor, closeTag) {
  const closeTest = closeTag && new RegExp(`</${closeTag}>`, 'i');
  var elements = [];

  while (!cursor.eof) {
    var textElement = text(cursor);
    if (textElement) {
      elements.push(textElement);
    }
    var tagElement = tag(cursor);
    if (tagElement) {
      elements.push(tagElement);
    }
    if (closeTest && cursor.capture(closeTest)) {
      return elements;
    }
  }

  if (closeTest) {
    throw new Error(`Expecting closing tag </${closeTag}> at line ${cursor.lineNumber}`);
  }

  return elements;
}

export function tag(cursor) {
  var startTag = captureStartTag(cursor);
  if (startTag) {
    if (!startTag.selfClosing) {
      startTag.children = content(cursor, startTag.rawName);
    }
    return startTag;
  }
}

export function text(cursor) {
  var textElement = { type: 'text', blocks: [] };
  var rawText;

  function captureAndStoreInterpolation() {
    var interpolationElement = cursor.capture(/^{\s*([^}]*)}/);
    if (interpolationElement) {
      textElement.blocks.push({
        type: 'interpolation',
        accessor: interpolationElement[1].trim(' ')
      });
      return true;
    }
  }

  // cursor may start with an interpolation...
  captureAndStoreInterpolation();

  while (rawText = captureTextUntilBreak(cursor)) {
    textElement.blocks.push(rawText);
    if (!captureAndStoreInterpolation() && cursor.test(/^\w/)) {
      // the next element isn't an interpolation, so must be a tag or EOF
      break;
    }
  }

  return textElement.blocks.length>0 ? textElement : null;
}

function captureTextUntilBreak(cursor) {
  var blocks = [];
  var text;
  while (text=cursor.capture(/^\s*([^<{])*/)) {
    if (cursor.test(/^(\\{)|(\\<)|(.<[^\w/])/, -1)) { // false alarm
      // this is not a break, capture the character and continue...
      blocks.push(text[0] + cursor.next());
    } else {
      blocks.push(text[0]);
      return blocks.join('');
    }
  }
}

function captureAttributes(cursor) {
  const attribRE = /^\s*([^=<>"'\s]+)\s*=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|(?:{([^}]*)}))/;
  var attribs = {};
  var match;

  while (match = cursor.capture(attribRE)) {
    var variable = match[1];
    if (match[3]) { // string
      attribs[variable] = match[3];
    } else if (match[4]) { //number
      attribs[variable] = parseFloat(match[4]);
    } else if (match[5]) { //interpolation
      debugger;
      attribs[variable] = {
        type: 'interpolation',
        accessor: match[5].trim(' ')
      };
    }
  }
  return attribs;
}

function captureStartTag(cursor) {
  var index = cursor.index;
  var tagMatch = cursor.capture(/^<(\w+)/);
  if (tagMatch) {
    var tagName = tagMatch[1];
    var attrs = captureAttributes(cursor);
    var endBracket = cursor.capture(/^\s*(\/)?>/);

    if (!endBracket) {
      throw new Error(`Error while parsing tag '${cursor.peek(index, 10)}...' at line ${cursor.lineNumber}`);
    }

    return {
      type: 'tag',
      name: tagName.toLowerCase(),
      rawName: tagName,
      attrs,
      children: [],
      selfClosing: endBracket[1]==='/'
    };
  }
}

