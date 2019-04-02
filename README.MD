# jQote2 Documentation

> This documentation has been update to reflect the modifications listed below.

> This documentation was copied from the WayBack Machine at [archive.org](http://archive.org/) because the original source at [http://aefxx.com/api/jqote2-reference/](http://aefxx.com/api/jqote2-reference/) is no longer available.

## Modifications (v4)

- Tags can be set individually for the start and end tag by providing an array.  Single characters can be provided and the matching closing character will be used (for supported characters, e.g., <> and {}).
- The default tag has been changed from ["<%", "%>"] to ["{{", "}}"] because several server side scripting engines already uses <% and it is inconvenient to have to always change the tag.
- NULL and UNDEFINED values are handled when encoding output with the `!` operator.
- Fixed a bug in template parsing where templates without a single root element caused errors.
- Added a 'context' parameter to all jQote2 rendering functions (before the tag parameter). This allows the developer to pass the current `context` object to a jQote2 rendering method which becomes available to the template as the `context.parent` value.
  - The `context.parent` value is useful when calling a jQote2 rendering method inside a template (i.e. nesting templates). It provides a way for the nested template to access data from the parent.
  - It is also useful to provide global data (that isn't necessarily part of the current data object) to the template without having to create global scope variables.

----

## jQote2 API reference

jQote2’s internals are quite a bit different from its predecessor’s. Thus, please make sure to double-check the new API as it breaks backward compatibility!

The three biggest changes with jQote2’s API are:

1. it now returns a “stringified” representation of your generated HTML markup
2. it’s now possible to precompile your templates to closures (no need to deliver template markup within your documents anymore)
3. it now supports on-the-fly templating strings

----

## Templates

Template content is traditionally contained within a `<script>` tag with a type attribute indicating that the content is a template (rather than JavaScript). The `template` parameter to most jQote2 functions is first treated as an element or a selector. If no matching element is found the parameter is treated as a content string.

When merging data to a template the engine begins in content mode and outputs the content as written until a start tag is matched (e.g., "{{"). The engine then enters script mode and the content is then processed as JavaScript until the end tag ("}}"). The script is executed. Any output from the script should be appended to the `out` variable. The engine then returns to content mode until another start tag is encountered or the template ends.

When a template is run several variables are accessible:

- `this` - the template is executed in context of the current object from the `data` array. To not be forced to use `data[j]` to access a template’s current data object, its compiled lambda is executed in the context of the data object, so you may use the this keyword to reference your data.
- `i` - increments with each processed template. The typical use case is to process data for one template so this value will remain 0. But it is possible to process a jQuery object consisting of several templates, in which case, `i` increments as each template is processed.
- `j` - increments with each object in the `data` array.
- `data` - the array of objects to merge into the template. This is the data parameter passed to the jQote2 functions. If an object is passed it is wrapped into an array.
- `fn` - the current template’s compiled lambda (which comes in handy with recursive calls).
- `context` - a container object that holds the current values available to the template. `context` is convenient for passing data to nested jQote2 calls.  This allows a "child" template to have access to the context of its parent.

	```javascript
	context = {
	  "that": data[j], // data[j] === this
	  "data": data,
	  "i": i,
	  "j": j,
	  "parent": context, // from the parentContext parameter of the jQote2 functions
	  "fn": fn
	};
	```
- `out` - the processed output string of the template so far.  You may manipulate the out string in any way you wish.  Typical usage is to append the results of some JavaScript logic.

#### **Template Mode Helpers**

Template mode tags also have 2 helpers.  The `=` and `!` helpers. When appended immediately after the start tag the template enters output script mode. In this mode the result of the script is automatically appended to the `out` variable.

- `=` - Literal output script mode. The results of the script are added to the out variable.
- `!` - Escaped output script mode. The results of the script are escaped (to be used in HTML attribute values) and then added to the out variable.

### **Example**

```html
<script id="exampleTemplate" type="text/x-template">
	<p>Hello {{=this.firstName}},</p>
	{{ if (this.birdList.length === 0) { }}
		<p>You have no favorite birds.</p>
	{{ } else { }}
		<p>Your favorite birds are:</p>
		<ul data-bird-list-id="{{!this.listID}}">
			{{ out += $("#nestedTemplate").jqote(this.birdList, context); 
		</ul>
	{{ } }}
</script>

<script id="nestedTemplate" type="text/x-template">
	<li>{{=this.birdNumber}} of {{context.parent.that.totalBirds}} {{=this.name}}</li>
</script>
```

----
### **$(template).jqote(data[, parentContext][, tag]) : function**

jQote2 is able to operate on an arbitrary number of templates, each of which may process an arbitrary number of data objects, thus effectively allowing you to trigger n:m conversions with a single call

#### **Returns**

`out` : string (the processed outcome)

#### **Parameters**

`data` : object | array of objects

	One or more objects that carry the template’s dynamic data. Each data object that’s passed in here will get merged with any of the templates you called the conversion upon.

`parentContext` : context object

	Used when making nested calls to jQote. The object is placed in the `context.parent` property allowing the nested call to access the parent's `context` object.

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

	You may use the optional tag parameter to specify different template tag character(s) for a single conversion. See the $.jqotetag function documentation for details on how the `tag` parameter is handled.

#### **Called upon**

`template` : jQuery object

	Every template within the jQuery collection will be merged with the data array.

#### **Example**

The infamous and obligatory “Hello World” … generated with a different start- and ending tag.

Note: data[j] is the same as this!
```html
<p id="example"></p>

<script type="text/x-jqote-template" id="template">
    I said <strong><*= this.greet + " " + data[j].who *></strong> !!!
    <* out = out.replace(/John/, 'World'); *>
</script>

<script type="text/javascript">
    // let's do some jQote magic
    $('#example').append(
        $('#template').jqote({greet: 'Hello', who: 'John'}, ['<*', '*>'])
    );
</script>
```
----
### **$(elem).jqoteapp(template, data[, parentContext][, tag]) : function**

This is one of three convenience methods jQote2 has to offer. It allows you to append the processed template’s outcome directly to any DOM element that is part of the jQuery object.

#### **Returns**

`jQuery` : jQuery object

	The returned jQuery object keeps the method chain intact. It is the same object that you called the convenience method upon.

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element | array of DOM element | lambda | array of lambda | template string

	This parameter can be passed as about anything you possibly could think of. It’ll work with a collection of template elements (either as jQuery object or array of DOM elements) as well as single template elements (again jQuery object or DOM element).
	
	Furthermore you could pass it a single or multiple (just wrap them up in an array) precompiled lambda which gets you the best performance as it will skip the compilation and execute right away.
	
	For quick and dirty on-the-fly templating you may also choose to supply a template string which won’t get cached but other than that behaves just as any other template.

`data` : object | array of objects

`parentContext` : context object

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

#### **Called upon**

`elem` : jQuery object

	The outcome of the conversion will be appended to every single DOM element within the jQuery object.

#### **Example**

The “Hello World” example from above rewritten.
```html
<p id="example"></p>

<script type="text/html" id="template">
    <![CDATA[
    I said <strong>{{this.greet + " " + this.who}}</strong> !!!
    {{ out = out.replace(/John/, 'World'); }}
    ]]>
</script>

<script type="text/javascript">
    // let's do some jQote magic
    $('#example').jqoteapp('#template', {greet: 'Hello', who: 'John'});
</script>
```
#### **Example**

This makes use of the on-the-fly templating support.
```html
<ul id="example"></ul>

<script type="text/javascript">
    $('#example').jqoteapp('<li><{{=this.tag}}>Styled!</{{=this.tag}}</li>', [{tag: 'strong'}, {tag: 'em'}]);
</script>
```
----
### **$(elem).jqotepre(template, data[, parentContext][, tag]) : function**

This is jqoteapp’s counterpart as it behaves just the same way with one major difference: it prepends the outcome rather than appends it.

#### **Returns**

`jQuery` : jQuery object

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element | array of DOM element | lambda | array of lambda | template string

`data` : object | array of objects

`parentContext` : context object

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

#### **Called upon**

`elem` : jQuery object

----

### **$(elem).jqotesub(template, data[, parentContext][, tag]) : function**

If you need to substitute an element’s “innerHTML” more than once, this function is for you. It replaces whatever resides within a DOM element with the outcome of your template’s processing.

#### **Returns**

`jQuery` : jQuery object

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element | array of DOM element | lambda | array of lambda | template string

`data` : object | array of objects

`parentContext` : context object

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

#### **Called upon**

`elem` : jQuery object

#### **Example**

Replace the target’s “innerHTML” with something more “up to date” …
```html
<p id="up_to_date"></p>

<script type="text/javascript">
    $(function() {
        var now = function() {
            return new Date().toString().replace(/ GMT.*$/, '');
        };
        $('#up_to_date').bind('uptodate', function() {
            var self = $(this);
            setTimeout(function() {
                self.jqotesub('{{=this.date}}', {date: now()})
                    .triggerHandler('uptodate');
            }, 1000);
        }).triggerHandler('uptodate');
    });
</script>
````
----

### **$.jqote(template, data[, parentContext][, tag]) : function**

This basically offers the same functionality as its object associated counterpart with the added possibility to have it process precompiled lambdas or on-the-fly template strings.

#### **Returns**

`out` : string (the processed outcome)

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element | array of DOM element | lambda | array of lambda | template string

`data` : object | array of objects

`parentContext` : context object

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

#### **Example**

Calculating the famous Fibonacci sequence (using just a small n due to JavaScript’s limited recursion stack).
```html
<ul id="fibonacci">
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
</ul>

<script type="text/x-jqote-template" id="template">
    <![CDATA[
    {{= ( ( this.n == 0 ) ?
            0 : ( this.n == 1 || this.n == 2 ) ?
                1 : parseInt($.jqote(fn, {n: this.n-1})) +
                        parseInt($.jqote(fn, {n: this.n-2})) ) }}
    ]]>
</script>
<script type="text/javascript">
    $(function() {
        var lambda = $.jqotec('#template');
        $('#fibonacci li').each(function(i) {
            $(this).text($.jqote(lambda, {n: i}));
        });
    });
</script>
```
----
### **$.jqotec(template[, tag]) : function**

This is jQote2’s heart, its engine that powers the template parsing and lambda generation. It transforms a single template into a compiled function that – once processed – is cached internally to speed up successive usage.

You may assign the returned lambda to a variable and/or pass it to any of the before mentioned functions or let jQote2 fetch it from its internal cache for you (just pass the associated DOM element in this case).

Please note that on-the-fly template strings won’t get cached as there’s no element to associate the lambda to. Moreover, if for whatever reason you need to recompile a cached template, jQote2 makes sure to replace the cached lambda for you.

#### **Returns**

`lambda` : function

	The compiled lambda is merely a JavaScript function like any other. Once called and fired in the context of a data object the lambda returns a “stringified” representation of your template’s and data object’s merge. In most cases this will be an “HTML string”, though it could be anything that goes into a string (i.e. plain text or a JSON string etc.).

	The lambda’s signature is defined as: ?(i, j, data, context, fn), where fn is a reference to ? (this is important when you need to have recursion within your templates).

	The context object becomes the parentContext when calling a jQote2 method from a template (if you pass context to the nested jQote2 function calls). It allows the inner child calls to reference the state of the parent.

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element | template string

	Please note that only the very first template of a set of matched templates within a supplied jQuery object (or selected by means of a jQuery selector) is chosen for compilation.

`tag` : string | array of strings (optional, defaults to ["{{", "}}"])

#### **Example**

See what the lambda of the above “Hello World” example looks like once it’s been compiled.
```html
<pre id="lambda"></pre>

<script type="text/x-jqote-template" id="template">
    <![CDATA[
    I said <strong>{{=this.greet + " " + this.who}}</strong> !!!
    * out = out.replace(/John/, 'World'); *
    ]]>
</script>

<script type="text/javascript">
    $(function() {
        $('#lambda').text(
            $.jqotec('#template', '*').toString()
        );
    });
</script>
```
---
### **$.jqotefn(template) : function**

jQote2 exposes its internal cache $.jqotecache and gives access to a template’s compilate by means of the its DOM element’s internal cache ID (just a plain integer starting at zero and running up). This cache ID is assigned to the template’s DOM element and may be read with elem.jqote or $(template selector)[0].jqote.

As it is a tedious task to type in $.jqotecache[$('#mytmpl')[0].jqote] over and over, you may as well just use the more convenient way: `$.jqotefn('#mytmpl')`

#### **Returns**

`lambda` : function (or false if nonexistent)

#### **Parameters**

`template` : jQuery object | jQuery selector | DOM element

----

### **$.jqotetag(string|array) : function**

Calling this function you will be able to permanently alter jQote2’s default tag char from being {{,}} to something more suitable to your needs.

#### **Returns**

`void`

#### **Parameters**

`tag` : string | array of strings

	string: The string is matched as the start and is reverse to match the end.  Special paired characters are also "mirrored". These are (, ), {, }, [, ], <, >, ‹, ›, «, », ‘, ’, “, ”. See the examples.

	array: Must consist of 2 elements. The first element is matched as the start tag and the second element is matched as the end tag.

#### **Examples**

```javascript
$.jqotetag("abc");
```

The start tag is set to "abc". The end tag is set to "cba".

```javascript
$.jqotetag("{{");
```

The start tag is set to "{{". The end tag is set to "}}".

```javascript
$.jqotetag("<%");
```

The start tag is set to "<%". The end tag is set to "%>".

```javascript
$.jqotetag("X");
```

The start tag is set to "X". The end tag is set to "X".

```javascript
$.jqotetag(["START", "END"]);
```

The start tag is set to "START". The end tag is set to "END".
