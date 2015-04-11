# ractive-engine
#### Template engine for node.js with Ractive.js.

Features like
- extend/block in [jade](http://jade-lang.com/) or
- layout/renderBody section/renderSection in [ASP.NET MVC Razor](http://www.asp.net/web-pages/overview/getting-started/introducing-razor-syntax-(c))

are supported. Actually they are the same thing.

## Install
```shell
npm i ractive-engine --save
```

## API
```js
// the default export engine
// instance of RactiveEngine with default options
var ractive = require('ractive-engine');

// RactiveEngine class definition
var RactiveEngine = require('ractive-engine').RactiveEngine;

// Ractive class used by this library
var Ractive = require('ractive-engine').Ractive;
```

### ractive.renderFile
ractive.renderFile(viewPath,locals) => result

It's synchronous,but view cache will be auto enabled when NODE_ENV set to production.

### RactiveEngine class options
- enableCache : whether enable view cache, if not specify explicitly , it's decided by `NODE_ENV === production`

- ext : extension of view file,for engine look up files when ignore extension, defaults to `.html`

- layoutRoot : where to find layouts
	- `{{extend './main'}}`, `./main` is relative to the file.

	- `{{#extend main}}{{/extend}}`,  layoutRoot is required here
		and layout resolve to `<layoutRoot>/main`

- partialRoot : where to find partials
	- `{{>partials.some.partial}}`
		partialRoot is required here,since it's built in Ractive , Use `{{#include relativePath}}`,will resolve to `<partialRoot>/partials/some/partial>`
		
	- `{{#include './partials/some/partial'}}` 
		It's same to use `{{>...}}`,but this can include a relative path

### express support
```js
// app is express app
app.engine('.html',require('ractive-engine').express(options));
```

## Syntaxs

### extend
```html
{{#extend someLayout}}
{{/extend}}
```

### block
```html
{{#block body}}
{{/block}}
```

It's processed recursivly,that's same to jade's behavior.
And template out of any block will be treat as a special `body` block. will fill layout's body block.
#### for example:

layout.html
```html
<html>
<head><title>{{#block title}}{{/block}}</title></head>
<body>
	<header>
	{{#block header}}
	{{/block}}
	</header>
	
	<div>
	{{#block body}}
	</div>
	
	<footer>
	{{#block footer}}
	{{/block}}
	</footer>
</body>
</html>
```

index.html
```html
{{#extend './layout'}}
{{/extend}}

{{#block title}}
I'm the title
{{/block}}

{{#block header}}
I will be the header.
{{/block}}

I'll be in body.

{{#block footer}}
I will be the footer
{{/block}}
```
will get
```html
<html>
<head><title>I'm the title</title></head>
<body>
	<header>
	I will be the header.
	</header>
	
	<div>
	I'll be in body.
	</div>
	
	<footer>
	I will be the footer
	</footer>
</body>
</html>
```
As you see. that `I'll be in body.` does not belongs to any block. So it's special `body` block. This behavior is same to `renderBody()` in ASP.NET MVC Razor.


### Other Ractive support syntax
check http://docs.ractivejs.org/latest/templates

# TODO
- add more test
- add prepend/append support
- set Ractive as git submodule
- add ccc ds project support

# License
the MIT License (magicdawn@qq.com)