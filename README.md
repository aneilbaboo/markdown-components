# markdown-components

Add React-like components to Markdown which can be safely used by end-users. It's designed to bolt on to any Markdown engine with a simple wrapper function.

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

## Quick start

```javascript
var { toHTML } = require("component-markdown");
var markdown = (new require('markdown-it'))(); // npm i markdown-it

// a function for rendering HTML using your favorite markdown engine:
var markdownEngine = function(mdText, render) {
  render(markdown.render(mdText)); // render the results
};

// define a Box component:
var components = {
  Box: function({ lineSize, color, __children }, render) {
    render(
      `<div style="border-width:${lineSize}; background-color:${color};">`
    );
    render(__children); // render internal elements
    render(`</div>`);
  }
};

// use the Box component:
var customizedMarkdown = `
Custom components:
<Box lineSize=2 color={ user.favoriteColor }>
Can contain...
# Markdown
And _markdown_ can contain custom components:
<Box lineSize=1 color="red">
which can contain *more markdown*
and so on
</Box>
</Box>`;

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

## Rationale

There are a number of JSX-markdown packages which allow developers to use Markdown syntax in their JSX files. In contrast, this library adds custom components to Markdown which can be safely used by end-users.

JSX-markdown libraries aren't suitable because React interpolation expressions are Javascript. I.e., you'd need to eval user-generated javascript either on your server or another user's browser. You could try evaluating such code in a sandboxed environment, but it's inefficient and asynchronous. The latter specifically rules out using that approach in React front ends, for example, which require synchronous rendering.

In this package, interpolation expressions, like `{ a.b }`, are not evaluated, so there is no script injection vulnerability, and inteprolation is a simple synchronous function. End-users only have access to variables you provide in a context object.

## API

### toHTML

Simple one step method for generating HTML.

Parses and renders Markdown with components to HTML, interpolating context variables.

```javascript
toHTML({
  input: '<MyComponent a={ x.y } b=123 c="hello"># This is {<InlineComponent/>} a heading</MyComponent>, 
  components: {
    MyComponent({a, b, c}, render) { render(`<div class=my-component>a=${a};b=${b};c=${c}</div>`); }
  },
  markdownEngine(mdText, render) { render(markdown.render(mdText)); },
  context:{ x: { y: "interpolated" } }
  // defaultComponent,
  // interpolator
});
// =>
// "<div class=my-component>a=interpolated;b=123;c=hello</div>"
```

### parse

Generates a parsed tree from component markdown input text.

Note that this function doesn't parse Markdown. Markdown parsing is currently done by the renderer. This is expected to change in future.

```javascript
var parsedElements = parse(`<MyComponent a={ x.y.z } b=123 c="hello">
# Please note
Currently, markdown is parsed
* during the rendering step
</MyComponent>
`);
// =>
// [
//   {
//     type: 'tag',
//     name: 'MyComponent',
//     attribs: {
//       a: { accessor: 'x.y.z' },
//       b: 123,
//       c: "hello"
//     }
//     children: [
//       {
//         type: 'text',
//         data: '# Please note\nCurrently, markdown is parsed\n* during the rendering step\n" 
//       }
//     ]
//   }
// ]
````

### Renderer

A class representing the rendering logic.

#### constructor

```javascript
var renderer = new Renderer({
  components: Object // { componentName: ({__name, __children, ...atrs})=>{}, ...}
  markdownEngine: Function // (markdown, render) => {}
  defaultComponent: Function // ({__name, __children, ...attrs}, render) = > {..render html }
  interpolator: Function // (context, accessor) => value
});
```

#### write

Writes an element (e.g., the result from parse) to `stream`, interpolating variables from the `context`:

```javascript
renderer.write(elt, context, stream);
var html = stream.toString();
```

### Components

The components argument is an object where keys are tag names, and functions render HTML. You must pass this argument to both the `Renderer` constructor and `toHTML` functions.

For example:

```javascript
{
  Box: function ({__name, __children, color}, render) {
    // generate custom HTML:
    render(`<div class="box" style="background-color:${color}">`);
    render(__children); // render elements between start and end tag
    render(`</div>`);
  }
}
```

Allows you to write:
```html
<Box color="red">
# This markdown
Will be displayed on a red background
</Box>
```

Component functions are of the form:
```javascript
(tagArguments, render) => { }
```

The first argument, tagArguments, contains values passed in the markup, plus two special keys:

`__name` name of the tag
`__children` array of Objects representing elements between the open and close tags, having the form:

The second argument, `render` is a function which takes a string representing HTML or an object representing parsed entities and writes it to a stream.


#### Higher Order Components

Because the component has responsibility for rendering `__children`, you can manipulate child elements at render time, choosing to ignore, rewrite or reorder them. For example, you could create elements that provide switch/case/default semantics:

```html
# Your Results
<Switch value={user.score}>
<Case value="A">You did _great_!</Case>
<Case value="B">Well done</Case>
<Default>Better luck next time</Default>
</Switch>
```

### Interpolator

An optional function which returns a value given the context and an accessor expression (the value contained between the braces in `#{...}`):

The default interpolator has behavior similar to lodash's get. It safely traverses object using a dot-separated accessor.

For example, given a context of `{ a: {b: 9 }}`, `{ a.b }` provides an interpolated value of `9`, and `{ x.y.z }` is `undefined`.

```javascript
function myInterpolator(context, accessor) {
  return context[accessor];
}

toHTML({
  interpolator: myInterpolator,
  ...
});
```

### Markdown Engine

You'll need to install a Markdown interpreter and write a wrapper function. You'll provide this to either the `Renderer` constructor or `toHTML` function:

```javascript
var MarkdownIt = require('markdown-it');
var markdown = new MarkdownIt();

var markdownItEngine = function (mdText, render) {
  render(markdown.render(mdText));
};

var html = toHTML({
  markdownEngine: markdownItEngine,
  ...
});
```

## Separately Parse and Render

If you're rendering the same content many times, it's more efficient to parse once and render the results many times. 

### Example
```javascript
var markdown = (new require('markdown-it'))(); // npm i markdown-it
var streams = require('memory-streams'); // npm i memory-streams
var renderer = new Renderer({
  componets: {
    Box({ __children, color }, render) {
      render(`<div class="box" style="background-color:${color}">`);
      render(__children);
      render(`</div>`);
    },
    markdownEngine(input, render) {
      render(markdown.render(input));
    }
  }
});

var parsedElements = parse('<Box color={user.favoriteColor}>_Here is some_ *markdown*</Box>');

// red box
stream = streams.getWriteableStream();
renderer.write(parsedElements,{ user: { favoriteColor: "red" } }, stream);
console.log(stream.toString());
// <div class="box" style="background-color:red"><i>Here is some</i> <b>markdown</b></div>

// blue box
stream = streams.getWriteableStream();
renderer.write(parsedElements,{ user: { favoriteColor: "blue" } }, stream);
console.log(stream.toString());
// <div class="box" style="background-color:blue"><i>Here is some</i> <b>markdown</b></div>
```
