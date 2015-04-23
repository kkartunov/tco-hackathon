var _ = require('lodash');
var Event = require('../models/Event');

/**
 * Parses uri path to extract parameters.
 *
 * @param {String} pathname
 * @returns {Object}
 */
function parsePath(pathname) {
  var parameters = pathname.split('/');
  return {
    eventId: parameters[1],
    teamId: parameters[3]
  };
}

/**
 * Reads and parses the available APIs list from the env.variable
 *
 * @returns {Array}
 */
function getAllAPIs() {
  var APIs = process.env.APIs;

  if (APIs && !_.isEmpty(APIs)) {
    APIs = _.map(process.env.APIs.split(','), _.trim);
    if (APIs.length < 2) {
      throw 'At least 2 APIs are needed to create the spin wheel';
    }
  } else {
    throw 'APIs environment variable missing or empty';
  }

  return APIs;
}

/**
 * Event handler for `getAPIs` call.
 * Emits the available APIs for the spin wheel.
 * With those the wheel will be created on client side.
 *
 * @param {String} pathname
 */
function getAPIs(socket, user, pathname) {
  var APIs = getAllAPIs();
  var parameters = parsePath(pathname);

  Event.findById(parameters.eventId, function (err, event) {
    if (err) {
      socket.emit('error', err);
    }
    // find the team
    var team = _.find(event.teams, {
      id: parameters.teamId
    });
    var apiSpins = team.apiSpins;
    var allowedSpins = process.env.NUMBER_OF_SPINS || 3;

    if (team.leader === user.member.handle && apiSpins.length < allowedSpins) {
      // Spin allowed.
      socket.emit('APIs', APIs);
    } else {
      socket.emit('APIs', []);
    }
  });
}

/**
 * Starts, spinns, handles result of the wheel of APIs.
 */
function spin(socket, user, options) {
  var startAngle = 0;
  var spinTime = 0;
  var spinTimeTotal = Math.random() * 3 + 4 * 1000;
  var spinInterval = 10;
  var parameters = parsePath(options.pathname);

  // Helper to start spinning...
  function spinme() {
    spinTime += spinInterval;
    if (spinTime >= spinTimeTotal) {
      stopRotateWheel();
      return;
    }
    var spinAngleStart = Math.random() * 10 + 10;
    var spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);

    socket.emit('spinning', startAngle);
    setTimeout(spinme, spinInterval);
  }

  // Helper to stop the rotation.
  function stopRotateWheel() {
    var degrees = startAngle * 180 / Math.PI + 90;
    var arcd = options.arc * 180 / Math.PI;
    var index = Math.floor((360 - degrees % 360) / arcd);

    // Write the result to db.
    Event.findById(parameters.eventId, function (err, event) {
      if (err) {
        socket.emit('error', err);
      }
      // find the team index
      var teamIndex = _.findIndex(event.teams, {
        id: parameters.teamId
      });

      // Chehck if API is already added?
      if (_.indexOf(event.teams[teamIndex].apiSpins, options.APIs[index]) != -1) {
        socket.emit('spin result', 'present');
      } else {
        event.teams[teamIndex].apiSpins.push(options.APIs[index]);
        event.save(function (err) {
          if (err) {
            socket.emit('error', err);
          } else {
            socket.emit('spin result', options.APIs[index]);
          }
        });
      }
    });
  }

  // Helper to ease out rotation.
  function easeOut(t, b, c, d) {
    var ts = (t /= d) * t;
    var tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
  }

  // Start spinning...
  spinme();
}

module.exports = function (socket, user) {

  // Listen for `getAPIs` event.
  socket.on('getAPIs', _.partial(getAPIs, socket, user));

  // Listen for `spin` event.
  socket.on('spin', _.partial(spin, socket, user));

};
