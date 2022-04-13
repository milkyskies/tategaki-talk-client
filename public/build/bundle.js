
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Message.svelte generated by Svelte v3.47.0 */

    const file$2 = "src/components/Message.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(/*sender*/ ctx[2]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text("「");
    			t3 = text(/*text*/ ctx[3]);
    			t4 = text("」");
    			attr_dev(div0, "class", "prefix svelte-1y05rno");
    			add_location(div0, file$2, 8, 8, 220);
    			attr_dev(div1, "class", "text svelte-1y05rno");
    			add_location(div1, file$2, 11, 8, 285);
    			attr_dev(div2, "class", "balloon svelte-1y05rno");
    			add_location(div2, file$2, 7, 4, 190);
    			attr_dev(div3, "class", "message-container svelte-1y05rno");
    			toggle_class(div3, "mine", /*currentUserId*/ ctx[0] === /*userId*/ ctx[1]);
    			add_location(div3, file$2, 6, 0, 116);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sender*/ 4) set_data_dev(t0, /*sender*/ ctx[2]);
    			if (dirty & /*text*/ 8) set_data_dev(t3, /*text*/ ctx[3]);

    			if (dirty & /*currentUserId, userId*/ 3) {
    				toggle_class(div3, "mine", /*currentUserId*/ ctx[0] === /*userId*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Message', slots, []);
    	let { currentUserId } = $$props;
    	let { userId } = $$props;
    	let { sender = "？" } = $$props;
    	let { text } = $$props;
    	const writable_props = ['currentUserId', 'userId', 'sender', 'text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Message> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('currentUserId' in $$props) $$invalidate(0, currentUserId = $$props.currentUserId);
    		if ('userId' in $$props) $$invalidate(1, userId = $$props.userId);
    		if ('sender' in $$props) $$invalidate(2, sender = $$props.sender);
    		if ('text' in $$props) $$invalidate(3, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ currentUserId, userId, sender, text });

    	$$self.$inject_state = $$props => {
    		if ('currentUserId' in $$props) $$invalidate(0, currentUserId = $$props.currentUserId);
    		if ('userId' in $$props) $$invalidate(1, userId = $$props.userId);
    		if ('sender' in $$props) $$invalidate(2, sender = $$props.sender);
    		if ('text' in $$props) $$invalidate(3, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentUserId, userId, sender, text];
    }

    class Message extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			currentUserId: 0,
    			userId: 1,
    			sender: 2,
    			text: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Message",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentUserId*/ ctx[0] === undefined && !('currentUserId' in props)) {
    			console.warn("<Message> was created without expected prop 'currentUserId'");
    		}

    		if (/*userId*/ ctx[1] === undefined && !('userId' in props)) {
    			console.warn("<Message> was created without expected prop 'userId'");
    		}

    		if (/*text*/ ctx[3] === undefined && !('text' in props)) {
    			console.warn("<Message> was created without expected prop 'text'");
    		}
    	}

    	get currentUserId() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentUserId(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userId() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userId(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sender() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sender(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/InputField.svelte generated by Svelte v3.47.0 */
    const file$1 = "src/components/InputField.svelte";

    function create_fragment$1(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let button;
    	let t2;
    	let br;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("テスト");
    			t1 = space();
    			div1 = element("div");
    			button = element("button");
    			t2 = text("送");
    			br = element("br");
    			t3 = text("信");
    			attr_dev(div0, "class", "input-field svelte-4v1yzb");
    			attr_dev(div0, "contenteditable", "true");
    			attr_dev(div0, "placeholder", /*placeholder*/ ctx[1]);
    			if (/*message*/ ctx[0] === void 0) add_render_callback(() => /*div0_input_handler*/ ctx[5].call(div0));
    			add_location(div0, file$1, 16, 0, 385);
    			add_location(br, file$1, 26, 59, 603);
    			attr_dev(button, "class", "send svelte-4v1yzb");
    			button.disabled = /*disabled*/ ctx[2];
    			add_location(button, file$1, 26, 2, 546);
    			attr_dev(div1, "class", "svelte-4v1yzb");
    			add_location(div1, file$1, 25, 0, 538);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);

    			if (/*message*/ ctx[0] !== void 0) {
    				div0.textContent = /*message*/ ctx[0];
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(button, t2);
    			append_dev(button, br);
    			append_dev(button, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "input", /*div0_input_handler*/ ctx[5]),
    					listen_dev(div0, "keydown", /*handleKeyDown*/ ctx[4], false, false, false),
    					listen_dev(button, "click", /*handleSubmit*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*placeholder*/ 2) {
    				attr_dev(div0, "placeholder", /*placeholder*/ ctx[1]);
    			}

    			if (dirty & /*message*/ 1 && /*message*/ ctx[0] !== div0.textContent) {
    				div0.textContent = /*message*/ ctx[0];
    			}

    			if (dirty & /*disabled*/ 4) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InputField', slots, []);
    	let { message } = $$props;
    	let { placeholder } = $$props;
    	let { disabled = false } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleSubmit = () => {
    		dispatch("submit");
    	};

    	const handleKeyDown = event => {
    		if (event.key === "Enter") {
    			event.preventDefault();
    			dispatch("submit");
    		}
    	};

    	const writable_props = ['message', 'placeholder', 'disabled'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InputField> was created with unknown prop '${key}'`);
    	});

    	function div0_input_handler() {
    		message = this.textContent;
    		$$invalidate(0, message);
    	}

    	$$self.$$set = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('disabled' in $$props) $$invalidate(2, disabled = $$props.disabled);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		message,
    		placeholder,
    		disabled,
    		dispatch,
    		handleSubmit,
    		handleKeyDown
    	});

    	$$self.$inject_state = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('disabled' in $$props) $$invalidate(2, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		message,
    		placeholder,
    		disabled,
    		handleSubmit,
    		handleKeyDown,
    		div0_input_handler
    	];
    }

    class InputField extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { message: 0, placeholder: 1, disabled: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputField",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*message*/ ctx[0] === undefined && !('message' in props)) {
    			console.warn("<InputField> was created without expected prop 'message'");
    		}

    		if (/*placeholder*/ ctx[1] === undefined && !('placeholder' in props)) {
    			console.warn("<InputField> was created without expected prop 'placeholder'");
    		}
    	}

    	get message() {
    		throw new Error("<InputField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<InputField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<InputField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<InputField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<InputField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<InputField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var getUserId = function () {
        var id = localStorage.getItem('tategaki-talk-userId');
        if (id) {
            return id;
        }
        id = Math.random().toString(32).substring(2);
        localStorage.setItem('tategaki-talk-userId', id);
        return id;
    };
    var getUsername = function () {
        var username = localStorage.getItem('tategaki-talk-username');
        if (username) {
            return username;
        }
        return "";
    };
    var setUsername = function (username) {
        localStorage.setItem('tategaki-talk-username', username);
    };

    /* src/App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i].userId;
    	child_ctx[19] = list[i].sender;
    	child_ctx[20] = list[i].message;
    	return child_ctx;
    }

    // (119:3) {#each messages as { userId, sender, message: text }}
    function create_each_block(ctx) {
    	let message_1;
    	let current;

    	message_1 = new Message({
    			props: {
    				currentUserId: /*currentUserId*/ ctx[7],
    				sender: /*sender*/ ctx[19],
    				userId: /*userId*/ ctx[18],
    				text: /*text*/ ctx[20]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(message_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(message_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const message_1_changes = {};
    			if (dirty & /*messages*/ 2) message_1_changes.sender = /*sender*/ ctx[19];
    			if (dirty & /*messages*/ 2) message_1_changes.userId = /*userId*/ ctx[18];
    			if (dirty & /*messages*/ 2) message_1_changes.text = /*text*/ ctx[20];
    			message_1.$set(message_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(message_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(message_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(message_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(119:3) {#each messages as { userId, sender, message: text }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let div0;
    	let inputfield;
    	let updating_message;
    	let updating_disabled;
    	let updating_placeholder;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let current;

    	function inputfield_message_binding(value) {
    		/*inputfield_message_binding*/ ctx[9](value);
    	}

    	function inputfield_disabled_binding(value) {
    		/*inputfield_disabled_binding*/ ctx[10](value);
    	}

    	function inputfield_placeholder_binding(value) {
    		/*inputfield_placeholder_binding*/ ctx[11](value);
    	}

    	let inputfield_props = {};

    	if (/*message*/ ctx[0] !== void 0) {
    		inputfield_props.message = /*message*/ ctx[0];
    	}

    	if (/*inputDisabled*/ ctx[2] !== void 0) {
    		inputfield_props.disabled = /*inputDisabled*/ ctx[2];
    	}

    	if (/*inputPlaceholder*/ ctx[5] !== void 0) {
    		inputfield_props.placeholder = /*inputPlaceholder*/ ctx[5];
    	}

    	inputfield = new InputField({ props: inputfield_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputfield, 'message', inputfield_message_binding));
    	binding_callbacks.push(() => bind(inputfield, 'disabled', inputfield_disabled_binding));
    	binding_callbacks.push(() => bind(inputfield, 'placeholder', inputfield_placeholder_binding));
    	/*inputfield_binding*/ ctx[12](inputfield);
    	inputfield.$on("submit", /*handleSubmit*/ ctx[8]);
    	let each_value = /*messages*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			div0 = element("div");
    			create_component(inputfield.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "input-section vertical-text svelte-54pdft");
    			add_location(div0, file, 103, 2, 3427);
    			attr_dev(div1, "class", "spacer svelte-54pdft");
    			add_location(div1, file, 117, 3, 3753);
    			attr_dev(div2, "class", "board vertical-text svelte-54pdft");
    			set_style(div2, "scroll-behavior", /*scrollMode*/ ctx[6]);
    			add_location(div2, file, 112, 2, 3648);
    			attr_dev(div3, "class", "main svelte-54pdft");
    			add_location(div3, file, 102, 1, 3406);
    			attr_dev(main, "class", "svelte-54pdft");
    			add_location(main, file, 101, 0, 3398);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, div0);
    			mount_component(inputfield, div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div2, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			/*div2_binding*/ ctx[13](div2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const inputfield_changes = {};

    			if (!updating_message && dirty & /*message*/ 1) {
    				updating_message = true;
    				inputfield_changes.message = /*message*/ ctx[0];
    				add_flush_callback(() => updating_message = false);
    			}

    			if (!updating_disabled && dirty & /*inputDisabled*/ 4) {
    				updating_disabled = true;
    				inputfield_changes.disabled = /*inputDisabled*/ ctx[2];
    				add_flush_callback(() => updating_disabled = false);
    			}

    			if (!updating_placeholder && dirty & /*inputPlaceholder*/ 32) {
    				updating_placeholder = true;
    				inputfield_changes.placeholder = /*inputPlaceholder*/ ctx[5];
    				add_flush_callback(() => updating_placeholder = false);
    			}

    			inputfield.$set(inputfield_changes);

    			if (dirty & /*currentUserId, messages*/ 130) {
    				each_value = /*messages*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputfield.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputfield.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*inputfield_binding*/ ctx[12](null);
    			destroy_component(inputfield);
    			destroy_each(each_blocks, detaching);
    			/*div2_binding*/ ctx[13](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let username = "";
    	let message = "";
    	let messages = [];
    	let inputDisabled = false;
    	let scrollMode = "auto";
    	let socket = null;
    	let inputField;
    	let board;
    	let inputPlaceholder = "メッセージを入力";
    	const currentUserId = getUserId();

    	const scrollToBottom = () => __awaiter(void 0, void 0, void 0, function* () {
    		yield tick();
    		$$invalidate(4, board.scrollLeft = -board.scrollWidth, board);
    	});

    	const handleSubmit = () => {
    		let payload = {};

    		if (!message) {
    			return;
    		}

    		if (message === "/clearname") {
    			localStorage.removeItem('tategaki-talk-username');
    			username = "";
    			$$invalidate(5, inputPlaceholder = "お名前を入力してください");
    		} else if (username === "") {
    			username = message;
    			setUsername(username);
    			$$invalidate(5, inputPlaceholder = "メッセージを入力");
    		} else {
    			$$invalidate(1, messages = [
    				...messages,
    				{
    					userId: currentUserId,
    					sender: username,
    					message
    				}
    			]);

    			payload = {
    				method: "chat",
    				data: {
    					userId: currentUserId,
    					sender: username,
    					message
    				}
    			};
    		}

    		socket.send(JSON.stringify(payload));
    		$$invalidate(0, message = "");
    		scrollToBottom();
    	};

    	onMount(() => {
    		scrollToBottom();
    		username = getUsername();

    		if (username === "") {
    			$$invalidate(5, inputPlaceholder = "お名前を入力してください");
    		}

    		// Socket stuff
    		socket = new WebSocket("ws://localhost:8082");

    		socket.onopen = () => {
    			console.log("Socket connected");
    		};

    		socket.onerror = error => {
    			console.error("Can not connect to socket", error);

    			$$invalidate(1, messages = [
    				...messages,
    				{
    					userId: "0",
    					sender: "管理人",
    					message: "サーバーに接続できません。"
    				}
    			]);

    			$$invalidate(2, inputDisabled = true);
    		};

    		socket.onmessage = event => {
    			if (!event.data) {
    				return;
    			}

    			const payload = JSON.parse(event.data);
    			console.log(payload);

    			if (payload["method"] === "update") {
    				$$invalidate(1, messages = payload["data"]);
    				scrollToBottom();
    			}
    		};

    		// Get the input field
    		var input = document.querySelector(".input-field");

    		// Execute a function when the user releases a key on the keyboard
    		input.addEventListener("keydown", function (event) {
    			// Number 13 is the "Enter" key on the keyboard
    			if (event.key === "Enter") {
    				// Cancel the default action, if needed
    				event.preventDefault();
    			} // Trigger the button element with a click
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function inputfield_message_binding(value) {
    		message = value;
    		$$invalidate(0, message);
    	}

    	function inputfield_disabled_binding(value) {
    		inputDisabled = value;
    		$$invalidate(2, inputDisabled);
    	}

    	function inputfield_placeholder_binding(value) {
    		inputPlaceholder = value;
    		$$invalidate(5, inputPlaceholder);
    	}

    	function inputfield_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputField = $$value;
    			$$invalidate(3, inputField);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			board = $$value;
    			$$invalidate(4, board);
    		});
    	}

    	$$self.$capture_state = () => ({
    		__awaiter,
    		onMount,
    		tick,
    		Message,
    		InputField,
    		getUserId,
    		getUsername,
    		setUsername,
    		username,
    		message,
    		messages,
    		inputDisabled,
    		scrollMode,
    		socket,
    		inputField,
    		board,
    		inputPlaceholder,
    		currentUserId,
    		scrollToBottom,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ('__awaiter' in $$props) __awaiter = $$props.__awaiter;
    		if ('username' in $$props) username = $$props.username;
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    		if ('messages' in $$props) $$invalidate(1, messages = $$props.messages);
    		if ('inputDisabled' in $$props) $$invalidate(2, inputDisabled = $$props.inputDisabled);
    		if ('scrollMode' in $$props) $$invalidate(6, scrollMode = $$props.scrollMode);
    		if ('socket' in $$props) socket = $$props.socket;
    		if ('inputField' in $$props) $$invalidate(3, inputField = $$props.inputField);
    		if ('board' in $$props) $$invalidate(4, board = $$props.board);
    		if ('inputPlaceholder' in $$props) $$invalidate(5, inputPlaceholder = $$props.inputPlaceholder);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		message,
    		messages,
    		inputDisabled,
    		inputField,
    		board,
    		inputPlaceholder,
    		scrollMode,
    		currentUserId,
    		handleSubmit,
    		inputfield_message_binding,
    		inputfield_disabled_binding,
    		inputfield_placeholder_binding,
    		inputfield_binding,
    		div2_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
        target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
