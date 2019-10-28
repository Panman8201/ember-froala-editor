import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { froalaMethod } from 'ember-froala-editor/helpers/froala-method';

module('Integration | Helper | froala-method', function(hooks) {
  setupRenderingTest(hooks);


  test('returns a closure / function', function(assert) {
    let closure = froalaMethod(["froala.method.name"]);
    assert.equal(typeof closure, 'function');
  });


  test('method closure works when editor is bound', function(assert) {
    let html = '<p>Foobar</p>';
    let editor = { // Mock an editor instance
      emberComponent: {}, // Added by <FroalaEditor>
      html: {
        get() {
          return html;
        }
      }
    };
    let closure = froalaMethod(['html.get']).bind(editor);
    assert.equal(closure(), html); // Mimic an options event callback
  });


  test('method closure works when editor is passed in', function(assert) {
    let html = '<p>Foobar</p>';
    let editor = { // Mock an editor instance
      emberComponent: {}, // Added by <FroalaEditor>
      html: {
        get() {
          return html;
        }
      }
    };
    // Ex: {{froala-method "html.get"}}
    let closure = froalaMethod(['html.get']);
    assert.equal(closure(editor), html); // Mimic an on-* event callback
  });


  test('arguments passed into the helper are applied to the method', function(assert) {
    let helperParam = 'foobar';
    let editor = { // Mock an editor instance
      emberComponent: {}, // Added by <FroalaEditor>
      callback(methodParam) {
        assert.equal(methodParam, helperParam);
      }
    };
    // Ex: {{froala-method "foobar"}}
    let closure = froalaMethod(['callback', helperParam]);
    closure(editor); // Mimic an on-* event callback
  });


  test('arguments replaced with event callback arguments', function(assert) {
    let eventParam = 'foobar';
    let editor = { // Mock an editor instance
      emberComponent: {}, // Added by <FroalaEditor>
      callback(methodParam) {
        assert.equal(methodParam, eventParam);
      }
    };
    // Ex: {{froala-method "replace" replace="2"}}
    let closure = froalaMethod(['callback', 'replace'], {replace: 2});
    closure(editor, eventParam); // Mimic an on-* event callback
  });


});
