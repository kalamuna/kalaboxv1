/**
 * @file
 * Configuration and starting point for the app.
 */

// Dependencies:
var express = require('express'),
    routes = require('./routes/routes'),
    appjs = require('appjs'),
    utils = require('util'),
    app = module.exports = express.createServer(),
    box = require('./kalabox/box'),
    logger = require('./logger');

// Initialize socket.io.
io = require('socket.io').listen(app);

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
app.get('/permission-denied', routes.noPermission);
app.post('/drush-upload', routes.drushUpload);

/**
 * Setup AppJS
 */

// override AppJS's built in request handler with connect
appjs.router.handle = app.handle.bind(app);

// have express listen on a port:51686
app.listen(51686);

/**
 * Window options; menus, icons, etc.
 */
var menubar = appjs.createMenu([
  {
    label: '&File',
    submenu: [{
      label: '&Quit Kalabox',
      action: function() {
        app.window.close();
      }
    }]
  }
]);

// Initialize error logging service.
logger.initialize(function() {
  // Initialize Kalabox and app window.
  box.initialize(function () {

    // create window with url: http://localhost:51686/ instead of http://appjs/
    var window = appjs.createWindow('http://localhost:51686/', {
      width : 640,
      height : 490,
      icons : __dirname + '/public/icons'
    });

    // show the window after initialization
    window.on('create', function() {
      window.frame.show();
      window.frame.center();
      window.frame.setMenuBar(menubar);
    });

    // add require/process/module to the window global object for debugging from the
    // DevTools
    window.on('ready', function() {
      window.require = require;
      window.process = process;
      window.module = module;
      window.addEventListener('keydown', function(e) {
        if (e.keyIdentifier === 'F12') {
          window.frame.openDevTools();
        }
      });
    });
    app.window = window;

  });
}, io);
