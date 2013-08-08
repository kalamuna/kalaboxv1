/**
 * Wrapper for a Bootstrap modal element.
 *
 * Copyright 2013 Kalamuna LLC
 */

var modal = module.exports = {
  template: ko.observable('vagrant-error'),
  $window: $('#dash-modal'),
  show: function() {
    this.$window.modal('show');
  },
  close: function() {
    this.$window.modal('hide');
  }
};
modal.$window.modal({show: false});
