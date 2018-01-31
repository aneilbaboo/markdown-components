# component-markdown

Add custom components to your markdown which are safe for end users.

```html
<MyComponent a=1 b="hello" c=#{ a.b }>
  ## subheading
  * listElement1
  * listElement2
  [google](https://google.com)
  <MyOtherComponent/>
  _more_ markdown
</MyComponent>
```

Unlike JSX-markdown libraries, interpolation expressions are not evaluated, so there is no script injection vulnerability.

Use your favorite markdown engine.

## Quick start

```javascript
var { toHTML } = require('component-markdown');
var MarkdownIt = requre('markdown-it');
var markdown = new MarkdownIt();

// choose your favorite markdown engine:
var markdownEngine = function (mdText, render) {
  render(markdown.render(mdText)); // render the results
};

// define a Box component:
var components = {
  Box: function ({lineSize, color, __children}, render) {
    render(`<div style="border-width:${lineSize}; background-color:${color};">`);
    render(__children); // render internal elements
    render(`</div>`);
  }
};

// use the Box component:
var customizedMarkdown = `<Box lineSize=2 color=#{ user.favoriteColor }>
# Internal Markdown
And..
<Box lineSize=1 color="red">
another box
</Box>
</Box>`

var html = toHTML({
  markdown: customizedMarkdown, 
  components: components, 
  markdownEngine: markdownEngine, 

});
console.log(html); // ~=>
// <div style="border-width:2; background-color>
// <h1> Internal Markdown</h1>
// And...
// <div style="border-width:1; background-color:red>
// another box
// </div>
// </div>
```

## Methods

### toHTML

Simple one step method for generating HTML.

```javascript

var html = toHTML({
  markdown: customizedMarkdown, 
  components: components, 
  markdownEngine: markdownEngine, 
  
});

