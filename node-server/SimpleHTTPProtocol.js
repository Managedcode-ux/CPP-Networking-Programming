import * as net from 'net'

accept().then((socket) => {
  newConn(socket)
}).catch(err => console.log(err))


function accept() {
  console.log("Initiating the accept function")
  return new Promise((resolve, reject) => {
    const server = net.createServer({ pauseOnConnect: true })

    server.on('error', (err) => reject(err))
    server.on('connection', (socket) => {
      resolve(socket);
    })

    server.listen({ host: '127.0.0.1', port: 1234 })
  })
}

async function newConn(socket) {
  console.log("New Connection: ", socket.remoteAddress, socket.remotePort);

  try {
    await serverClient(socket);
  } catch (exc) {
    console.error("Exception :- ", exc)
  } finally {
    socket.destroy()
  }
}

function bufPush(buf, data) {
  const newLen = data.length + buf.length;
  if (buf.data.length < newLen) {
    let cap = Math.max(buf.data.length, 32);
    while (cap < newLen) {
      cap *= 2;
    }
    const grow = Buffer.alloc(cap);
    buf.data.copy(grow, 0, 0);
    buf.data = grow;
  }
  data.copy(buf.data, buf.length, 0);
  buf.length = newLen;
}

function bufPop(buf, len) {
  buf.data.copyWithin(0, len, buf.length);
  buf.length -= len;
}

function cutMessage(buf) {
  const idx = buf.data.subarray(0, buf.length).indexOf('\n');
  if (idx < 0) {
    return null
  }
  const msg = Buffer.from(buf.data.subarray(0, idx + 1));

  bufPop(buf, idx + 1)
  return msg;
}

async function serverClient(socket) {
  const conn = soInit(socket);
  const buf = { data: Buffer.alloc(0), length: 0 };
  while (true) {
    const msg = cutMessage(buf)
    if (!msg) {
      const data = await soRead(conn);
      bufPush(buf, data)
      if (data.length === 0) {
        console.log("Connection Ended");
        break;
      }
      continue;
    }

    if (msg.equals(Buffer.from('quit\n'))) {
      await soWrite(conn, Buffer.from('Bye.\n'))
      socket.destroy();
      return;
    } else {
      const reply = Buffer.concat([Buffer.from('Echo: '), msg]);
      await soWrite(conn, reply);
    }
  }
}


function soInit(socket) {
  const conn = {
    socket: socket,
    reader: null,
    ended: false,
    err: null
  }

  socket.on('data', (data) => {
    console.assert(conn.reader)

    conn.socket.pause();

    if (conn.reader) {
      conn.reader.resolve(data);
      conn.reader = null
    }
  });

  socket.on('end', () => {
    conn.ended = true;
    if (conn.reader) {
      conn.reader.resolve(Buffer.from(''));
      conn.reader = null;
    }
  })

  socket.on('error', (err) => {
    conn.err = err;
    if (conn.reader) {
      conn.reader.reject(err);
      conn.reader = null;
    }
  })
  return conn;
}

function soRead(conn) {
  console.assert(!conn.reader)

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }
    if (conn.ended) {
      resolve(Buffer.from(''));
      return;
    }
    conn.reader = { resolve: resolve, reject: reject }
    conn.socket.resume()
  })
}

function soWrite(conn, data) {
  console.assert(data.length > 0);
  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    conn.socket.write(data, (err) => {
      if (err) {
        reject(err)
      }
      else {
        resolve();
      }
    })
  })
}