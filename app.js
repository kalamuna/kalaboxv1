/**
 * @file
 * Configuration and starting point for the app.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var express = require('express'),
    routes = require('./routes/routes'),
    utils = require('util'),
    app = module.exports = express.createServer(),
    box = require('./kalabox/box'),
    logger = require('./logger'),
    exec = require('child_process').exec;

// Initialize socket.io.
io = require('socket.io').listen(app);
io.set('log level', 1); // Only show warning messages.

// Configuration
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({
    src : __dirname + '/public',
    enable : ['less']
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions : true,
    showStack : true
  }));
});
app.configure('production', function() {
  app.use(express.errorHandler());
});

// Routes:
app.get('/', routes.index);
app.get('/install', routes.install);
app.get('/dash', routes.dash);
app.get('/error', routes.errorPage);
app.get('/no-internet', routes.noInternet);
app.get('/help', routes.helpPage);
app.get('/permission-denied', routes.noPermission);
app.get('/sites-list', routes.sitesList);
app.get('/site-db-backups/:id', routes.siteDbBackups);
app.get('/firewall-issue', routes.firewallIssue);
app.get('/update', routes.update);

// have express listen on a port:51686
app.listen(51686);

// Initialize error logging service.
logger.initialize(function() {
  // Initialize Kalabox and app window.
  box.initialize(function () {
    // Make sure box can clean up after itself when the user quits.
    process.on('SIGTERM', function() {
      box.cleanUp(function() {
        process.exit();
      });
    });
    // This should fix our issues
    window.location = "http://localhost:51686/"
  });
}, io);
