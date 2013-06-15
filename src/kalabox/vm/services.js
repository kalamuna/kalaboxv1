/**
 * Monitors the statuses of services running on the Kalabox.
 */

// Dependencies:
var connector = require('./connector'),
    flow = require('nue').flow,
    as = require('nue').as;

// Data objects:
var socket;

exports.initialize = flow('initialize')(
  function initialize0() {
    // Grab the socket.io connection when it's established.
    io.sockets.on('connection', function (newSocket) {
      socket = newSocket;
    });
  }
);

var checkNginx = flow('checkNginx')(
  function checkNginx0(callback) {
    this.data.callback = callback;
    connector.getConnection(this.async());
  },
  function checkNginx1(connection) {
    connection.exec('service status nginx');
  }
);
