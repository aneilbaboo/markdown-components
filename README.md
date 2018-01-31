# component-markdown

Add custom components to your markdown.  Safe to be used by end-users.

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

This library is intended to provide an enhanced, customizable Markdown language, allowing end users to generate sophisticated documents using custom components provided by the developer.

Unlike JSX-markdown libraries, interpolation expressions are not evaluated, so there is no script injection vulnerability.

Use your favorite markdown engine.

## Quick start

```javascript
var { toHTML } = require('component-markdown');
var MarkdownIt = requre('markdown-it');
var markdown = new MarkdownIt();

// a function for rendering HTML using your favorite markdown engine:
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
var customizedMarkdown = `
Custom components:
<Box lineSize=2 color=#{ user.favoriteColor }>
Can contain...
# Markdown
And _markdown_ can contain custom components:
<Box lineSize=1 color="red">
which can contain *more markdown*
and so on
</Box>
</Box>`

var html = toHTML({
  input: customizedMarkdown, 
  components: components, 
  markdownEngine: markdownEngine
});
console.log(html); // ~=>
// Custom components:
// <div style="border-width:2; background-color>
// Can contain...
// <h1> Markdown</h1>
// And <i>markdown</i> can contain custom components:
// <div style="border-width:1; background-color:red>
// which can contain <b>more markdown</b>
// and so on
// </div>
// </div>
```
## API

### toHTML

Simple one step method for generating HTML. 

Calls parse, instantiates a Renderer and generates HTML 

```javascript

var html = toHTML({
  input, // required text containing mixed markdown & component markup
  components, // Object containing component functions
  markdownEngine, 
  defaultComponent,
  interpolator
});
```

### parse
Generates a parsed tree from component markdown input text

```javascript
var elements = parse(input);
```

### Renderer

A class representing the rendering logic. 

#### constructor

```javascript
var renderer = new Renderer({
  components: Object // 
  markdownEngine: Function // (markdown, render) => {}
  defaultComponent: Function // ({__name, __children, ..attrs}, render) = > {..render html }
  interpolator: Function // (context, accessor) => value
});
```

#### write

Writes an element (e.g., the result from parse) to `stream`, interpolating variables from the `context`:

```javascript
renderer.write(elt, context, stream);

console.log(stream.toString()); // outputs the HTML
```

### Components

The `Renderer` and `toHTML` take an argument components. It is an object where keys represent case insensitive component names, and the values are functions which are responsible for rendering HTML. They have the form:

```javascript
function ({__name, __children, ...attrs}, render) {
  // the body of the function generates 
  // whatever HTML you need:
  render(`<div>`);
  render(__children); // don't forget to render any internal elements
  render(`</div>`);
}
```
The first argument is an Object containing attribute values passed 

`attrs` any key value pairs representing the components attributes passed in the markup and potentially interpolated from the context
`__name` name of the tag
`__children` array of Objects representing elements between the open and close tags, of the form:
```javascript
{
  type: string, // "tag", "text", or "script" 
  name: string, // name of the tag
  attrs: Object, // attributes passed to this component
  data: string, //
  children: array // array of objects like this
}
```
  
### Interpolator

An optional function which returns a value given the context and an accessor expression (the value contained between the braces in `#{...}`):

The default interpolator has behavior similar to lodash's get. 

