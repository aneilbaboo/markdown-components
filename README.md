[![CircleCI](https://circleci.com/gh/aneilbaboo/markdown-components.svg?style=shield&circle-token=fbb8592a984a41740eebf952734f4776b86b0504)](https://circleci.com/gh/aneilbaboo/markdown-components)

# markdown-components

Add custom React-like components to Markdown which can be safely used by end-users. Use with your favorite Markdown engine.

E.g., 
```html
<Box color={user.favoriteColor} lineWidth=3>
  ## subheading
  * listElement1
  * listElement2
  [google](https://google.com)
  <Box color=blue>Box in box!</Box>
  _more_ markdown
</Box>
```

## Install

```javascript
npm i markdown-components
// plus your favorite markdown engine
// npm i markdown
// npm i showdown
// npm i markdown-it
```

## Quick start

```javascript
var { toHTML, markdownItEngine } = require("markdown-components");

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
# Markdown with interpolation:
This box should be *{ user.favoriteColor }*
And the _markdown_ can contain custom components:
<Box lineSize=1 color="red">
which can contain *more markdown*
and so on.
Render open curly brace and open angle bracket: {{ and <<
</Box>
</Box>`;

// render the markdown with your custom components,
// providing context variables:
var html = toHTML({
  input: customizedMarkdown,
  components: components,
  context: { user: { favoriteColor: 'blue' }},
  markdownEngine: markdownItEngine()
});
console.log(html); // ~=>
// Custom components:
// <div style="border-width:2; background-color>
// Can contain...
// <h1> Markdown with interpolation:</h1>
// This box should be <b>blue</b>
// And the <i>markdown</i> can contain custom components:
// <div style="border-width:1; background-color:red>
// which can contain <b>more markdown</b>
// and so on.
// Render open curly brace and open angle bracket: { and &lt
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
// requires: npm install markdown-it
import { markdownItEngine, toHTML } from 'markdown-components';
toHTML({
  input: '<MyComponent a={ x.y } b=123 c="hello"># This is {<InlineComponent/>} a heading</MyComponent>', 
  components: {
    MyComponent({a, b, c}, render) { render(`<div class=my-component>a=${a};b=${b};c=${c}</div>`); }
  },
  markdownEngine: markdownItEngine(),
  context:{ x: { y: "interpolated" } }
  // defaultComponent,
  // interpolator
});
// =>
// "<div class=my-component>a=interpolated;b=123;c=hello</div>"
```

### Parser

Class for parsing component markdown input text.

Note that this function doesn't parse Markdown. Markdown parsing is currently done by the renderer. This is expected to change in future.

#### parse 

```javascript
import { Parser, showdownEngine } from 'markdown-components';
var parser = new Parser({markdownEngine:}); // use showdownjs
var parsedElements = parser.parse(`<MyComponent a={ x.y.z } b=123 c="hello">
# User likes { user.color } color
</MyComponent>
`);
// =>
// [
//   {
//     type: "tag",
//     name: 'mycomponent',
//     rawName: 'MyComponent',
//     attribs: {
//       a: { accessor: "x.y.z" },
//       b: 123,
//       c: "hello"
//     }
//     children: [
//       {
//         type: "text",
//         blocks: [
//           "<h1>User likes ",
//           { type: "interpolation", accessor: "user.color" }
//           "color</h1>"
//         ]
//       }
//     ]
//   }
// ]
```

### Renderer

A class representing the rendering logic.

#### constructor

```javascript
var renderer = new Renderer({
  components: Object // { componentName: ({__name, __children, ...atrs})=>{}, ...}
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

The components argument is an object where keys are tag names, and functions render HTML. This is a required argument of the `Renderer` constructor and the `toHTML` function.

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

A number of wrappers for existing Markdown interpreters are provided in `src/engines.js`. Each is a function which returns a rendering function. There are wrappers MarkdownIt, ShowdownJS and evilStreak's markdown. It's easy to write your own wrapper. See the source file.

```javascript
import { toHTML, markdownItEngine } from 'markdown-components';

var html = toHTML({
  markdownEngine: markdownItEngine,
  ...
});
```

## Separately Parse and Render

If you're concerned about efficiency, parse the input first, and cache the result (a plain JSON object). Call Renderer.write with different contexts:

### Example
```javascript
var { markdownItEngine, Renderer, Parser } = require('markdown-components'); // remember to "npm i markdown-it"
var streams = require('memory-streams'); // "npm i memory-streams"
var renderer = new Renderer({
  componets: {
    Box({ __children, color }, render) {
      render(`<div class="box" style="background-color:${color}">`);
      render(__children);
      render(`</div>`);
    }
  }
});

var parser = new Parser({ markdownEngine: markdownItEnginer() });
var parsedElements = parser.parse('<Box color={user.favoriteColor}>_Here is some_ *markdown*</Box>');

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
