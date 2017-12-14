var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var { format } = require('date-fns');

var app = express();

var server = http.Server(app);
var io = require('socket.io')(server);

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Ruangan yang terdaftar di sistem
var registeredRooms = [
  { id: 1, name: 'Ruangan Dosen', status: 'normal' },
  { id: 2, name: 'Koperasi', status: 'normal' },
];

// untuk menyimpan log dari device
var logs = [];

// mendapatkan data ruangan berdasarkan id dari ruangan
function findRoom(roomId) {
  var room = registeredRooms.find(function (room) {
    return room.id === roomId;
  });

  return room;
}

// update status dari ruangan
function updateRoomStatus(roomId, status) {
  registeredRooms = registeredRooms.map(function (room) {
    if (room.id === roomId) {
      room.status = status;
    }

    return room;
  });
}

app.get('/', function (req, res) {
  var data = { logs };
  
  res.render('index', data);
});

app.get('/logs', function (req, res) {
  res.json(logs);
});

app.get('/registered-rooms', function (req, res) {
  res.json(registeredRooms);
});

app.post('/logs', function (req, res) {
  var fire = parseInt(req.body.fire);
  var smoke = parseInt(req.body.smoke);
  var roomId = parseInt(req.body.roomId);

  console.log('Request payload', { fire, smoke, roomId });

  const isValidFireValue = fire === 0 || fire === 1;

  if (fire === NaN || !isValidFireValue) {
    res.status(422).json({ message: 'fire value should be either 0 or 1' });

    return;
  }

  if (smoke === NaN) {
    res.status(422).json({ message: 'smoke value should be a number' });

    return;
  }

  var room = findRoom(roomId);

  if (!room) {
    res.status(404).json({ message: `Room is with ID of ${roomId} not found` })
    
    return;
  }

  var MIN_SMOKE = 100;
  var IS_FIRE = 1;
  var isFireOccured = smoke > MIN_SMOKE && fire === IS_FIRE;
  var isTooManySmoke = smoke > 70 && fire === 0;

  var log = {
    ...room,
    smoke: smoke,
    fire: fire,
    isFireOccured,
    createdAt: format(new Date(), 'YYYY-MM-DD HH:mm:ss'),
  };
  
  io.emit('sensor-log', log);

  if (isTooManySmoke) {
    // lakukan sesuatu
  }

  if (isFireOccured) {
    io.emit('fire-occured', { ...room, isFireOccured, fire, smoke });
    updateRoomStatus(roomId, 'Fire occured');
  }
  
  // catatan: kalau request dari alat tiap detik
  // pertimbangkan, soalnya terlalu berat u/ server u/ write ke db mysql tiap detik
  logs.push(log)

  res.json({ message: 'Ok' });
});

module.exports = server;
