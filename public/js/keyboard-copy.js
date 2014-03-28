/**
 * Enable text copy from the keyboard.
 */

Mousetrap.bind(['command+c', 'ctrl+c'], function(event) {
  document.execCommand('Copy');
});
