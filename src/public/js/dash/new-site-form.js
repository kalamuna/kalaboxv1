var validator = new FormValidator('new-site-form', [{
  id: 'new-site-id',
  rules: 'callback_check_site_id',
}], function(errors, event) {
  if (errors.length > 0) {
    var errorString = '';

    for (var i = 0, errorLength = errors.length; i < errorLength; i++) {
        errorString += errors[i].message + '<br />';
    }

    $('<div class="alert alert-danger">' + errorString + '</div>').insertBefore('.modal-body');
  }
});

validator.registerCallback('check_site_id', function(value) {
  console.log('THIS RAN');
  var patt = new RegExp('[0-9a-z-]*$');
  console.log(patt.test(value));
  return patt.test(value);
}).setMessage('check_site_id', 'Please set a site URL that only has lowercase letters, numbers, and dashes.');
