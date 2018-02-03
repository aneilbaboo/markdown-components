import { Readable } from 'stream';
import RE2 from 're2';

function parse(input) {
  return content(input);
}

const TextUntilInterpolationOrTag = /^\s*([^<{])*/;
const UntilInterpolationEnd = /^\s*([^\s}]*)\s*}/;
const IsTagStartChar = /^<\w/;
function isInterpolationStart(input) {
  return /^{\s*([^{])/;
}

function textUntilInterpolationOrTag(input) {
  var text = .exec(input);
  if (text) {
    return [text, input.slice(text.length)];
  }
}

function isEnd(input) {
  return input.length==0;
}

function textElement(text) {
  if (text) {
    return {
      type: 'text',
      sequences: [ text ]
    };
  }
}

function addElementIfValid(elements, newElement) {
  if (newElement) {
    elements.push(newElement);
  }
}

function makeTagCloseTest(tag) {
  var tagRE = new RegExp(`^<\/(${tag})>`, i);
  return function(input) {
    if (tagRE.test(input)) {
      return  [true, input.slice(tag.length + 3)];
    } else {
      return [false, input];
    }
  }
}

function content(cursor, closeTest) {
  closeTest = closeTest || function () { return false; };
  var elements = [];
  var text;
  var currentElement;
  var result
  var closed;

  while (!isEnd(cursor)) {
    [text, cursor] = textUntilInterpolationOrTag(cursor);
      
    // If tag, add the text to the elements
    if (cursor.text[0]==='<') { 
      addElementIfValid(elements, textElement(text));
    
      // closing!
      if (cursor.text[1]==='/') {
        [closed, cursor] = closeTest(input);

        if (closed) {
          return [elements, cursor];
        } else {
          throw new Error(`Unexpected closing tag`)
        }
      }
      [closed, input] = closeTest(input); 
      if (closed) {
        return [elements, input];
      }    
      

      
    }
  }
  if (isEnd(nextInput)) {
    if (terminator(nextInput)) {
      return elements;
    } else {
      elements.push(tag(nextInput));
    }
  } else if (isInterpolationStart(input)) {
    elements.push({
      type: 'interpolation',

    })
  }
}

function text()
/**
 * Tag.
 */
function tag() {
  debug('tag %j', xml);
  var m = match(/^<([\w-:.]+)\s*/);
  if (!m) return;

  // name
  var node = {
    name: m[1],
    attributes: {},
    children: []
  };

  // attributes
  while (!(eos() || is('>') || is('?>') || is('/>'))) {
    var attr = attribute();
    if (!attr) return node;
    node.attributes[attr.name] = attr.value;
  }

  // self closing tag
  if (match(/^\s*\/>\s*/)) {
    return node;
  }

  match(/\??>\s*/);

  // content
  node.content = content();

  // children
  var child;
  while (child = tag()) {
    node.children.push(child);
  }

  // closing
  match(/^<\/[\w-:.]+>\s*/);

  return node;
}
