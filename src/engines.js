// https://github.com/markdown-it/markdown-it
export function markdownItEngine(options) {
  const MarkdownIt = require('markdown-it');
  const markdown = new MarkdownIt(options);

  return function markdownRenderer(mdText, render) {
    var text = markdown.render(mdText);
    if (text[text.length-1]==='\n') {
      render(text.slice(0, text.length-1));
    } else {
      render(text);
    }
  };
}

// https://github.com/evilstreak/markdown-js
export function evilStreakMarkdownEngine(dialect) {
  const markdown = require('markdown').markdown;
  return function markdownRenderer(mdText, render) {
    render(markdown.toHTML(mdText, dialect));
  };
}

// https://github.com/showdownjs/showdown
export function showdownEngine(options) {
  const showdown  = require('showdown');
  const converter = new showdown.Converter(options || { noHeaderId:true });
  return function markdownRenderer(mdText, render) {
    render(converter.makeHtml(mdText));
  };
}
