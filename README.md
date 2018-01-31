# markdown-components

Add custom React-like components to your Markdown which are safe for end-users. The goal is to enable developers to create rich document editing creation systems for their users. It's designed to bolt on to any Markdown engine with a simple wrapper function.

```html
<MyComponent a=1 b="hello" c={ a.b }>
  ## subheading
  * listElement1
  * listElement2
  [google](https://google.com)
  <MyOtherComponent/>
  _more_ markdown
</MyComponent>
```

## Rationale

This approach is different from JSX-markdown packages, which are intended for _developers_, enabling them to write Markdown syntax in their code instead of raw HTML elements. These libraries aren't suitable for use by end-users because React interpolation expressions are full Turing-complete Javascript. Producing HTML would require eval'ing user-generated content either on the server or another user's browser, introducing a security hole.

In this package, interpolation expressions, like `c={ a.b }` in the fragment above, are not evaluated, so there is no script injection vulnerability. 

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

Components are functions which render HTML.  They're provided to the `Renderer` constructor and the `toHTML` as an Object where the keys are the component names, and the values are a function which takes attributes and a rendering function as arguments:

```javascript
// example component function:
function ({__name, __children, ...attrs}, render) {
  // generate custom HTML:
  render(`<div>`);
  render(__children); // render elements between start and end tag
  render(`</div>`);
}
```

The first argument is an Object containing attribute values passed in the markup, plus a couple of special keys:

`attrs` interpolatd key value pairs passed in the markup
`__name` name of the tag
`__children` array of Objects representing elements between the open and close tags, having the form:

```javascript
{
  type: string, // "tag", "text", or "script" 
  name: string, // name of the tag
  attribs: Object, // attributes passed to this component
  children: array // array of objects like this
}
```

#### Higher Order Components

Because the component has responsibility for rendering `__children`, you can manipulate child elements at render time, choosing to ignore, rewrite or reorder them. For example, you could create elements that provide switch/case/default semantics:

```html
# Your Results
<Switch value=#{user.score}>
<Case value="A">You did _great_!</Case>
<Case value="B">Well done</Case>
<Default>Better luck next time</Default>
</Switch>
```

### Interpolator

An optional function which returns a value given the context and an accessor expression (the value contained between the braces in `#{...}`):

The default interpolator has behavior similar to lodash's get. 

