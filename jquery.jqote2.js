/*
 * jQote2 - client-side Javascript templating engine
 * Copyright (C) 2010, aefxx
 * http://aefxx.com/
 *
 * Dual licensed under the WTFPL v2 or MIT (X11) licenses
 * WTFPL v2 Copyright (C) 2004, Sam Hocevar
 *
 * Date: Fri, May 4th, 2012
 * Version: 0.9.8 (v4)
 */
(function($) {
	var JQOTE2_TMPL_UNDEF_ERROR = 'UndefinedTemplateError',
		JQOTE2_TMPL_COMP_ERROR  = 'TemplateCompilationError',
		JQOTE2_TMPL_EXEC_ERROR  = 'TemplateExecutionError';

	var ARR  = '[object Array]',
		STR  = '[object String]',
		FUNC = '[object Function]';

	var TAG_PAIRS = { "(" : ")", "{" : "}", "[" : "]", "<" : ">", "‹": "›", "«": "»", "‘": "’", "“":  "”" };

	var n = 1, tag = ['{{', '}}'],
		qreg = /^[^<]*(<[\w\W]+>)[^>]*$/,
		type_of = Object.prototype.toString;

	function raise(error, ext) {
		throw ($.extend(error, ext), error);
	}

	function dotted_ns(fn) {
		var ns = [];

		if ( type_of.call(fn) !== ARR ) return false;

		for ( var i=0,l=fn.length; i < l; i++ )
			ns[i] = fn[i].jqote_id;

		return ns.length ?
			ns.sort().join('.').replace(/(\b\d+\b)\.(?:\1(\.|$))+/g, '$1$2') : false;
	}

	function lambda(tmpl, t) {
		var f, fn = [], t = t || tag,
			type = type_of.call(tmpl);

		if ( type === FUNC )
			return tmpl.jqote_id ? [tmpl] : false;

		if ( type !== ARR )
			return [$.jqotec(tmpl, t)];

		if ( type === ARR )
			for ( var i=0,l=tmpl.length; i < l; i++ )
				if ( f = lambda(tmpl[i], t) ) fn.push(f[0]);

		return fn.length ? fn : false;
	}

	$.fn.extend({
		jqote: function(data, parentContext, t) {
			var data = type_of.call(data) === ARR ? data : [data],
				dom = '', context;

			this.each(function(i) {
				var fn = $.jqotec(this, t);

				for (var j = 0; j < data.length; j++) {
					context = { that: data[j], data: data, i: i, j: j, parent: parentContext, fn: fn };
					dom += fn.call(data[j], i, j, data, context, fn);
				}
			});

			return dom;
		}
	});

	$.each({app: 'append', pre: 'prepend', sub: 'html'}, function(name, method) {
		$.fn['jqote'+name] = function(elem, data, parentContext, t) {
			var ns, regexp, str = $.jqote(elem, data, parentContext, t),
				$$ = !qreg.test(str) ?
					function(str) { return $(document.createTextNode(str)); } : function (str) { return $("<div/>").html(str).contents(); };

			if ( !!(ns = dotted_ns(lambda(elem))) )
				regexp = new RegExp('(^|\\.)'+ns.split('.').join('\\.(.*)?')+'(\\.|$)');

			return this.each(function() {
				var dom = $$(str);

				$(this)[method](dom);

				( dom[0].nodeType === 3 ?
					$(this) : dom ).trigger('jqote.'+name, [dom, regexp]);
			});
		};
	});

	$.extend({
		jqote: function(template, data, parentContext, t) {
			var str = '', t = t || tag, context,
				fn = lambda(template, t);

			if ( fn === false )
				raise(new Error('Empty or undefined template passed to $.jqote'), {type: JQOTE2_TMPL_UNDEF_ERROR});

			data = type_of.call(data) !== ARR ?
				[data] : data;

			for (var i = 0, l = fn.length; i < l; i++) {
				for (var j = 0; j < data.length; j++) {
					context = { that: data[j], data: data, i: i, j: j, parent: parentContext, fn: fn[i] };
					str += fn[i].call(data[j], i, j, data, context, fn[i]);
				}
			}

			return str;
		},

		jqotec: function(template, t) {
			var cache, elem, tmpl, t = t || tag, rev, i
				type = type_of.call(template);

			var st = "", et = "";
			if (type_of.call(t) === ARR) {
				st = tag[0];
				et = tag[1];
			} else {
				st = tag;
				rev = st.split('').reverse();
				for (i = 0; i < rev.length; i++) {
					rev[i] = TAG_PAIRS[rev[i]] || rev[i];
				}
				et = rev.join('');
			}

			if ( type === STR && qreg.test(template) ) {
				elem = tmpl = template;

				if ( cache = $.jqotecache[template] ) return cache;
			} else {
				elem = type === STR || template.nodeType ?
					$(template) : template instanceof jQuery ?
						template : null;

				if ( !elem[0] || !(tmpl = elem[0].innerHTML) && !(tmpl = elem.text()) )
					raise(new Error('Empty or undefined template passed to $.jqotec'), {type: JQOTE2_TMPL_UNDEF_ERROR});

				if ( cache = $.jqotecache[$.data(elem[0], 'jqote_id')] ) return cache;
			}

			var str = '', index,
				arr = tmpl.replace(/\s*<!\[CDATA\[\s*|\s*\]\]>\s*|[\r\n\t]/g, '')
					.split(st).join(et+'\x1b')
						.split(et);

			for ( var m=0,l=arr.length; m < l; m++ )
				str += arr[m].charAt(0) !== '\x1b' ?
					"out+='" + arr[m].replace(/(\\|["'])/g, '\\$1') + "'" : (arr[m].charAt(1) === '=' ?
						';out+=(' + arr[m].substr(2) + ');' : (arr[m].charAt(1) === '!' ?
							';out+=$.jqotenc((' + arr[m].substr(2) + '));' : ';' + arr[m].substr(1)));

			str = 'try{' +
				('var out="";'+str+';return out;')
					.split("out+='';").join('')
						.split('var out="";out+=').join('var out=') +
				'}catch(e){e.type="'+JQOTE2_TMPL_EXEC_ERROR+'";e.args=arguments;e.template=arguments.callee.toString();throw e;}';

			try {
				var fn = new Function('i, j, data, context, fn', str);
			} catch ( e ) { raise(e, {type: JQOTE2_TMPL_COMP_ERROR}); }

			index = elem instanceof jQuery ?
				$.data(elem[0], 'jqote_id', n) : elem;

			return $.jqotecache[index] = (fn.jqote_id = n++, fn);
		},

		jqotefn: function(elem) {
			var type = type_of.call(elem),
				index = type === STR && qreg.test(elem) ?
					elem : $.data($(elem)[0], 'jqote_id');

			return $.jqotecache[index] || false;
		},

		jqotetag: function(str) {
			if ( type_of.call(str) === STR || type_of.call(str) === ARR ) tag = str;
		},

		jqotenc: function(str) {
			return (str === undefined ? "undefined" : (str === null ? "null" : str)).toString()
					.replace(/&(?!\w+;)/g, '&#38;')
						.split('<').join('&#60;').split('>').join('&#62;')
							.split('"').join('&#34;').split("'").join('&#39;');
		},

		jqotecache: {}
	});

	$.event.special.jqote = {
		add: function(obj) {
			var ns, handler = obj.handler,
				data = !obj.data ?
					[] : type_of.call(obj.data) !== ARR ?
						[obj.data] : obj.data;

			if ( !obj.namespace ) obj.namespace = 'app.pre.sub';
			if ( !data.length || !(ns = dotted_ns(lambda(data))) ) return;

			obj.handler = function(event, dom, regexp) {
				return !regexp || regexp.test(ns) ?
					handler.apply(this, [event, dom]) : null;
			};
		}
	};
})(jQuery);
