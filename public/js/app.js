var socket = io();

function createRoomEl(room) {
  var room = `
    <div id="room-${room.id}" class="room">
      <div class="room-wrapper">
        <div class="room-id">ID ${room.id}</div>
        <div class="room-name">Nama ${room.name}</div>
        <div class="room-status">
          <span class="status-header">Status</span>
          <span class="status-text">${room.status}</span>
        </div>
        <br>
        <div class="room-sensor-values">
          <span>Asap <span class="smoke">${room.smoke || 0}</span></span>
          <span>Api <span class="fire">${room.fire || 0}</span></span>
        </div>
      </div>
      <div class="room-sensor-logs">
        <div class="log-header">Log</div>
      </div>
    </div>
  `;

  return room;
}

function createRoomsHTML(rooms) {
  var roomEls = rooms.map(function (room) {
    return createRoomEl(room);
  }).join('');

  var container = document.querySelector('#rooms-container');

  container.innerHTML = roomEls;
}

function createLogEl(data) {
  var div = document.createElement('div');
  div.setAttribute('class', 'log');

  div.innerHTML = `
    <div class="log-time">@ ${data.createdAt}</div>
    <div class="log-values">
      <span>Asap: ${data.smoke}</span>
      <span>Api: ${data.fire}</span>
    </div>
  `;

  return div;
}

function appendLog(roomId, log) {
  var roomEl = findRoomEl(roomId);

  var roomSensorLogs = roomEl.querySelector('.room-sensor-logs');

  var logEl = roomSensorLogs.querySelector('.log');

  if (!logEl) {
    roomSensorLogs.append(createLogEl(log));
  } else {
    roomSensorLogs.insertBefore(createLogEl(log), logEl)
  }
}

function findRoomEl(roomId) {
  var elId = '#room-' + roomId;
  var roomEl = document.querySelector(elId);

  return roomEl;
}

function changeRoomStatus(roomId, status) {
  var roomEl = findRoomEl(roomId);

  var statusEl = roomEl.querySelector('.room-status .status-text');

  statusEl.style.color = 'red';
  statusEl.innerHTML = status;
}

function updateSensorValues(roomInFire) {
  var roomEl = findRoomEl(roomInFire.id);

  var sensorValuesEl = roomEl.querySelector('.room-sensor-values');

  sensorValuesEl.querySelector('.smoke').innerHTML = roomInFire.smoke;
  sensorValuesEl.querySelector('.fire').innerHTML = roomInFire.fire;
}

// ambil semua data ruangan yang terdaftar di sistem
fetch('/registered-rooms')
  .then(function (res) {
    return res.json();
  })
  .then(function (rooms) {
    // buat html berdasarkan ruangan yang ada
    createRoomsHTML(rooms);

    // subscribe event websocket
    socket.on('sensor-log', function (room) {
      updateSensorValues(room);
      const { smoke, fire, createdAt } = room;
      appendLog(room.id, { smoke, fire, createdAt });
    });

    socket.on('fire-occured', function (roomInFire) {
      if (roomInFire.isFireOccured) {
        changeRoomStatus(roomInFire.id, 'Fire occured');
      }
    });
  });