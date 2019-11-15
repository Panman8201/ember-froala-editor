import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { action } from '@ember/object';
import { assign } from '@ember/polyfills';
import { isHTMLSafe, htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import { froalaArg } from 'ember-froala-editor/helpers/froala-arg';
import { froalaHtml } from 'ember-froala-editor/helpers/froala-html';
import FroalaEditor from 'froala-editor';


export default class FroalaEditorComponent extends Component {


  options = {};


  editor = null;


  get update() {
    return this.args.update;
  }


  get updateEvent() {
    return this.args.updateEvent || 'contentChanged';
  }


  get returnSafeString() {
    return (
      typeof this.args.returnSafeString === 'undefined' ?
      isHTMLSafe(this.args.content) :
      this.args.returnSafeString
    );
  }


  get fastboot() {
    return getOwner(this).lookup('service:fastboot');
  }


  get content() {
    return (
      isHTMLSafe(this.args.content) ?
      this.args.content :
      htmlSafe(this.args.content)
    );
  }


  get propertyOptions() {
    let options = {};
    for (let propertyName in this) {
      if (FroalaEditor.DEFAULTS.hasOwnProperty(propertyName)) {
        options[propertyName] = this[propertyName];
      }
    }
    return options;
  }


  get argumentOptions() {
    let options = {};
    for (let argumentName in this.args) {
      if (FroalaEditor.DEFAULTS.hasOwnProperty(argumentName)) {
        options[argumentName] = this.args[argumentName];
      }
    }
    return options;
  }


  get propertyCallbacks() {
    let callbacks = {};

    // Regex's used for replacing things in the name
    const regexOnOrHtml = /^on-/g;
    const regexHyphens  = /-/g;
    const regexDots     = /\./g;

    // Class methods are not available in a `for (name in this)` loop
    let propertyNames = Object.getOwnPropertyNames(this.__proto__);

    for (let i in propertyNames) {
      let propertyName = propertyNames[i];

      // Only names that start with on- are callbacks
      if (propertyName.indexOf('on-') !== 0) {
        continue;
      }

      assert(
        `<FroalaEditor> ${propertyName} event callback property must be a function`,
        typeof this[propertyName] === 'function'
      );

      // Convert the name to what the event name would be
      let eventName = propertyName;
      eventName = eventName.replace(regexOnOrHtml, '');
      eventName = eventName.replace(regexHyphens, '.');

      // Special use case for the 'popups.hide.[id]' event
      // Ember usage would be '@on-popups-hide-id=(fn)'
      // https://www.froala.com/wysiwyg-editor/docs/events#popups.show.[id]
      if (eventName.indexOf('popups.hide.') === 0) {
        let id = eventName.replace('popups.hide.', '');
        id = id.replace(regexDots, '-'); // Convert back to hyphens
        eventName = `popups.hide.[${id}]`;
      }

      // Wrap the callback to pass the editor in as the first argument
      callbacks[eventName] = this[propertyName];
    }

    return callbacks;
  }


  get argumentCallbacks() {
    let callbacks = {};

    // Regex's used for replacing things in the name
    const regexOnOrHtml = /^on-/g;
    const regexHyphens  = /-/g;
    const regexDots     = /\./g;

    for (let argumentName in this.args) {

      // Only names that start with on- are callbacks
      if (argumentName.indexOf('on-') !== 0) {
        continue;
      }

      assert(
        `<FroalaEditor> @${argumentName} event callback argument must be a function`,
        typeof this.args[argumentName] === 'function'
      );

      // Convert the name to what the event name would be
      let eventName = argumentName;
      eventName = eventName.replace(regexOnOrHtml, '');
      eventName = eventName.replace(regexHyphens, '.');

      // Special use case for the 'popups.hide.[id]' event
      // Ember usage would be '@on-popups-hide-id=(fn)'
      // https://www.froala.com/wysiwyg-editor/docs/events#popups.show.[id]
      if (eventName.indexOf('popups.hide.') === 0) {
        let id = eventName.replace('popups.hide.', '');
        id = id.replace(regexDots, '-'); // Convert back to hyphens
        eventName = `popups.hide.[${id}]`;
      }

      // Wrap the callback to pass the editor in as the first argument
      callbacks[eventName] = this.args[argumentName];
    }

    return callbacks;
  }


  get combinedOptions() {
    let config = getOwner(this).resolveRegistration('config:environment');
    return assign(
      {},
      config['ember-froala-editor'],
      this.options,
      this.propertyOptions,
      this.args.options,
      this.argumentOptions
    );
  }


  get combinedCallbacks() {
    return assign(
      {},
      this.propertyCallbacks,
      this.argumentCallbacks
    );
  }


  get optionsWithInitEvent() {
    let options = this.combinedOptions;

    // Determine which event will be called first
    let initEventName = (
      this.combinedOptions.initOnClick ?
      'initializationDelayed' :
      'initialized'
    );

    // Ensure the events object exists
    options.events = options.events || {};

    // Add the created callback to the proper initialization event
    options.events[initEventName] = froalaArg([this.setupEditor, initEventName]);

    return options;
  }


  constructor(owner, args) {
    super(owner, args);
    assert(
      '<FroalaEditor> @content argument must be a string or SafeString from htmlSafe()',
      (typeof args.content === 'string' || typeof args.content === 'undefined' || isHTMLSafe(args.content))
    );
    assert(
      '<FroalaEditor> @update argument must be a function',
      (typeof args.update === 'function' || typeof args.update === 'undefined')
    );
    assert(
      '<FroalaEditor> @updateEvent argument must be a string',
      (typeof args.updateEvent === 'string' || typeof args.updateEvent === 'undefined')
    );
    assert(
      '<FroalaEditor> @returnSafeString argument must be a boolean',
      (typeof args.returnSafeString === 'boolean' || typeof args.returnSafeString === 'undefined')
    );
    assert(
      '<FroalaEditor> @options argument must be an object',
      (typeof args.options === 'object' || typeof args.options === 'undefined')
    );
  }


  @action createEditor(element, [options]) {
    new FroalaEditor(element, options);
  }


  @action setupEditor(editor, initEventName, ...args) {

    // Add a reference to each other so they accessible from either
    editor.component = this;
    this.editor = editor;

    // Add event handler callbacks, passing in the editor as the first arg
    for (let eventName in this.combinedCallbacks) {
      this.editor.events.on(eventName, froalaArg([this.combinedCallbacks[eventName]]));
    }

    // Add update callback when a setter is passed in
    if (this.update) {
      this.editor.events.on(this.updateEvent, froalaHtml([this.update]), true); // true = run first
    }

    // Add destroyed callback so the editor can be unreferenced
    this.editor.events.on('destroy', froalaArg([this.teardownEditor]), false); // false = run last

    // Since we overrode this event callback,
    // call the passed in callback(s) if there are any
    if (this.combinedOptions.events && typeof this.combinedOptions.events[initEventName] === 'function') {
      // Mimic default behavior by binding the editor instance to the called context
      this.combinedOptions.events[initEventName].bind(editor)(...args);
    }
    if (typeof this.combinedCallbacks[initEventName] === 'function') {
      // Mimic a typical on-* callback by passing in the editor as the first arg
      this.combinedCallbacks[initEventName](editor, ...args);
    }

  }


  @action updateContent(element, [content]) {
    let html = (isHTMLSafe(content) ? content.toString() : content);

    // When the editor is available,
    // updates should go through `editor.html.set()`
    if (this.editor) {

      // Avoid recursive loop, check for changed content
      if (this.editor.html.get() !== html) {
        this.editor.html.set(html);
      }

    // When the editor is NOT available,
    // updates should go through the DOM (directly)
    } else {

      // Avoid recursive loop, check for changed content
      if (element.innerHTML !== html) {
        element.innerHTML = html;
      }

    }
  }


  @action destroyEditor(/*element*/) {
    // Guard against someone calling editor.destroy()
    // from an event callback, which teardownEditor()
    // would still trigger and unreference the editor
    // before this callback had a chance to run
    if (this.editor) {
      this.editor.destroy();
    }
  }


  @action teardownEditor(editor/*, ...args*/) {
    delete editor.component;
    this.editor = null;
  }


}
