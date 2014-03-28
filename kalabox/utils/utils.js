/**
 * @file
 * Generic utilities for Kalabox.
 *
 * Copyright 2013 Kalamuna LLC
 */

/**
 * Escapes spaces in a string.
 *
 * @param string
 *   Text to escape.
 *
 * @return string
 *   String with spaces escaped with backslashes.
 */
exports.escapeSpaces = function(text) {
  return text.replace(' ', '\\ ');
};

/**
 * Times the run of an async function.
 *
 * @param function asyncFunc
 *   Asynchronous function to call.
 * @param integer timeLimit
 *   Milliseconds to wait before considering the function run failed.
 * @param function successCallback
 *   Callback to call if the async call finishes in time.
 * @param function failCallback
 *   Callback to call if the async call does not finish in time.
 */
exports.timedRun = function(asyncFunc, timeLimit, successCallback, failCallback) {
  var failed = false,
      succeeded = false;
  var finished = function() {
    if (!failed) {
      succeeded = true;
      successCallback.apply(null, arguments);
    }
  };
  asyncFunc(finished);
  setTimeout(function() {
    if (!succeeded) {
      failed = true;
      failCallback();
    }
  }, timeLimit);
};
