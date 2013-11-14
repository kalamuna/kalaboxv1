/**
 * @file
 * Module to retrieve configuration variables from JSON config file.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var config = require('./kalabox.json'), // Loads our config file.
    kalastackConfig = require('./kalastack.json');

// Process config file.
for (var configProp in config) {
  if (!config.hasOwnProperty(configProp)) {
    continue;
  }
  var property = config[configProp];
  // Replace all $HOME references with real path to user's home.
  if (property.indexOf('$HOME') !== -1) {
    config[configProp] = property.replace('$HOME', process.env.HOME);
  }
}

/**
 * Retrieves a configuration variable by name.
 * @param string name
 *   The name of the config variable to look up.
 *
 * @return mixed
 *   Value of the config variable.
 */
var get = function(name) {
  if (typeof this[name] === 'undefined') {
    throw new Error('Requested undefined configuration variable: ' + name);
  }
  return this[name];
};
exports.get = get.bind(config);

/**
 * An accessor object for accessing Kalastack-specific configuration.
 */
exports.kalastack = {
  get: get.bind(kalastackConfig)
};

/**
 * The root directory of the app.
 */
exports.root = __dirname;
