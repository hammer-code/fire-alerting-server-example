var socket = io();
var ROOM_INSTANCES = [];
var STATUS_NORMAL = 'Normal';
var STATUS_FIRE_OCCURED = 'Fire Occured!';
var sound = new Howl({
  src: ['/sound/alarm.mp3']
});

function createRoomContainerEl(id) {
  var el = document.createElement('div');

  el.setAttribute('id', id);
  el.setAttribute('class', 'room');

  return el;
}

function roomWrapperHTMLString (data) {
  return `
    <div class="room-wrapper">
      <div class="room-id">ID ${data.id}</div>
      <div class="room-name">Nama ${data.name}</div>
      <div class="room-status">
        <span class="status-header">Status</span>
        <span class="status-text">${data.status}</span>
      </div>
      <br>
      <div class="room-sensor-values">
        <span>Asap <span class="smoke">${data.smoke || 0}</span></span>
        <span>Api <span class="fire">${data.fire || 0}</span></span>
      </div>
    </div>
    <div class="action">
      <button class="stop-alarm btn">Stop Alarm</button>
      <button class="resolve btn">Fire Resolved</button>
    </div>
    <div class="room-sensor-logs">
      <div class="log-header">Log</div>
    </div>
  `;
}
      
function Room(data) {
  this.id = data.id;
  
  var elId = `room-${data.id}`;
  
  this.elId = elId;
  this.name = data.name;
  this.status = data.status;
  this.sensorValues = {
    fire: data.fire || 0,
    smoke: data.smoke || 0,
  };

  var containerEl = createRoomContainerEl(this.id);
  containerEl.innerHTML = roomWrapperHTMLString(data);

  this.el = containerEl;

  var alarmButton = this.el.querySelector('.action .stop-alarm');
  var resolveButton = this.el.querySelector('.action .resolve');

  alarmButton.addEventListener('click', this.stopAlarmSound.bind(this));
  resolveButton.addEventListener('click', this.resolve.bind(this))
}

Room.prototype.resolve = function () {
  this.stopAlarmSound();

  var body = `roomId=${this.id}&status=${STATUS_NORMAL}`;
  var headers = new Headers();
  headers.append('Content-Type', 'application/x-www-form-urlencoded');
  headers.append('Content-Length', body.length);

  fetch('/status', {
    method: 'POST',
    headers: headers,
    body: body,
  }).then(() => {
    this.setStatus(STATUS_NORMAL);
  });
};

Room.prototype.mount = function (targetElement) {
  var container = document.querySelector(targetElement);

  container.appendChild(this.el)
};

Room.prototype.addLog = function (data) {
  var roomSensorLogs = this.el.querySelector('.room-sensor-logs');

  var logEl = roomSensorLogs.querySelector('.log');

  if (!logEl) {
    roomSensorLogs.append(createLogEl(data));
  } else {
    roomSensorLogs.insertBefore(createLogEl(data), logEl)
  }
};

Room.prototype.setStatus = function (status) {
  var statusEl = this.el.querySelector('.room-status .status-text');
  
  if (status === STATUS_FIRE_OCCURED) {
    statusEl.style.color = 'red';
  } else if (status === STATUS_NORMAL) {
    statusEl.style.color = 'black';
  } else {
    return;
  }

  statusEl.innerHTML = status;
};

Room.prototype.playAlarmSound = function () {
  if (!this.soundId) {
    this.soundId = sound.play();
  }
};

Room.prototype.stopAlarmSound = function () {
  if (this.soundId) {
    sound.stop(this.soundId);
    this.soundId = null;
  }
};

Room.prototype.updateSensorValues = function (data) {
  var sensorValuesEl = this.el.querySelector('.room-sensor-values');

  sensorValuesEl.querySelector('.smoke').innerHTML = data.smoke;
  sensorValuesEl.querySelector('.fire').innerHTML = data.fire;
};

function createRoomInstances(rooms) {
  rooms.forEach(function (data) {
    var room = new Room(data);

    room.mount('#rooms-container');

    ROOM_INSTANCES.push(room);
  });
}

// ambil semua data ruangan yang terdaftar di sistem
fetch('/registered-rooms')
  .then(function (res) {
    return res.json();
  })
  .then(function (rooms) {
    // buat html berdasarkan ruangan yang ada
    createRoomInstances(rooms);

    // subscribe event websocket
    socket.on('sensor-log', function (data) {
      ROOM_INSTANCES.forEach(function (room) {
        if (room.id === data.id) {
          room.updateSensorValues(data);
          room.addLog(data);
        }
      });
    });

    socket.on('fire-occured', function (roomInFire) {
      var roomInstance = ROOM_INSTANCES.find(function (r) {
        return r.id === roomInFire.id;
      });

      if (!roomInFire) {
        return;
      }

      roomInstance.setStatus(STATUS_FIRE_OCCURED);
      roomInstance.playAlarmSound();
    });
  });