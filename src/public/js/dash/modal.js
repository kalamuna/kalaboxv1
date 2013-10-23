/**
 * Wrapper for a Bootstrap modal element.
 *
 * Copyright 2013 Kalamuna LLC
 */

var errorMessages = require('./error-messages.json');

var modal = module.exports = {
  template: ko.observable('vagrant-error'),
  title: ko.observable(''),
  message: ko.observable(''),
  $window: $('#dash-modal'),
  show: function() {
    this.$window.modal('show');
  },
  close: function() {
    this.$window.modal('hide');
  },
  notify: function(title, message) {
    this.template('modal-notification');
    this.title(title);
    this.message(message);
    this.show();
  },
  showError: function(error) {
    var code = error.code,
        message = error.message;
    if (!code && !message) {
      return false;
    }
    var content = message || '';
    if (code && errorMessages[code]) {
      content = errorMessages[code];
    }
    this.notify('Error', content);
    return true;
  }
};
modal.$window.modal({show: false});
