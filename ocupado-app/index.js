'use strict';

var path = require('path');
var fs = require('fs');
var EventSource = require('eventsource');
var request = require('request');
var _ = require('lodash');

var app = require('app');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var Tray = require('tray');
var Menu = require('menu');
var MenuItem = require('menu-item');

var onlineStatusWindow;
var tray;
var eventSource;
var state = 'unknown';

var defaultConfig = require('./config/default');
var localConfigPath = path.join(__dirname, '/config', 'local.js')
var localConfig = fs.existsSync(localConfigPath) ? require(localConfigPath) : {};
var config = _.merge({}, defaultConfig, localConfig);

var apiEventsUrl = config.spark.apiBaseUrl + '/v1/devices/' + config.spark.deviceId + '/events?access_token=' + config.spark.apiToken;
var apiStateUrl = config.spark.apiBaseUrl + '/v1/devices/' + config.spark.deviceId + '/state?access_token=' + config.spark.apiToken;

app.dock.hide();

function createTray() {
  tray = new Tray(path.join(__dirname, '/assets', '/tray-icon-unknown.png'));
  tray.setPressedImage(path.join(__dirname, '/assets', 'tray-icon-unknown-pressed.png'));
  createTrayMenu();
}

function updateTray() {
  tray.setImage(path.join(__dirname, '/assets', '/tray-icon-' + state + '.png'));
  tray.setPressedImage(path.join(__dirname, '/assets', '/tray-icon-' + state + '.png'));
  createTrayMenu();
}

function createTrayMenu() {
  var menu = new Menu();

  menu.append(new MenuItem({
    label: state,
    enabled: false
  }));

  menu.append(new MenuItem({
    type: 'separator'
  }));

  menu.append(new MenuItem({
    label: 'Quit',
    click: app.quit
  }));

  tray.setContextMenu(menu);
}

function connect() {
  console.log('Connecting to Spark');

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  eventSource = new EventSource(apiEventsUrl);

  eventSource.onopen = function() {
    console.log('Spark connected successfully');
    getCurrentState();
  };

  eventSource.onerror = function() {
    console.log('Error communicating with Spark');

    if (state !== 'unknown') {
      state = 'unknown';
      updateTray();
    }

    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('Attempting to reconnect in 3 seconds');
      setTimeout(reconnect, 3000);
    }
  };

  eventSource.addEventListener('state', function(event) {
    var data = JSON.parse(event.data);
    state = data.data;
    updateTray();
  }.bind(this), false);
}

function reconnect() {
  if (eventSource.readyState === EventSource.CLOSED) {
    connect();
  }
}

function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  state = 'unknown';
  updateTray();
}

function getCurrentState() {
  request(apiStateUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var data = JSON.parse(body);
      state = data.result;
      updateTray();
    }
  }.bind(this));
}

function createOnlineStatusWindow() {
  onlineStatusWindow = new BrowserWindow({ width: 0, height: 0, show: false });
  onlineStatusWindow.loadUrl('file://' + path.join(__dirname, '/online-status.html'));
}

ipc.on('onlineStatusMessage', function(event, status) {
  if (status === 'online') {
    connect();
  } else {
    disconnect();
  }
});

app.on('ready', function() {
  createTray();
  createOnlineStatusWindow();
});
