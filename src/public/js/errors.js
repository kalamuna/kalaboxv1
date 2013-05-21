/**
 * @file
 * Front-end interaction for the error page.
 */

(function($) {
  "use strict";

  // Select all text in error log contents textarea on click.
  $('.log-contents').on('click', function(event) {
    this.select();
  });

})(jQuery);
