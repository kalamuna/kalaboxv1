#!/bin/bash

browserify data/public/js/dash/main.js -o data/public/js/dash-compiled.js
data/bin/node --harmony data/app
