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
  console.log("New Connecion function initiated with this socket ==>", socket)
  console.log("New Connection: ", socket.remoteAddress, socket.remotePort);

  try {
    await serverClient(socket);
  } catch (exc) {
    console.error("Exception :- ", exc)
  } finally {
    socket.destroy()
  }
}

async function serverClient(socket) {
  const conn = soInit(socket);
  while (true) {
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log("Connection Ended");
      break;
    }

    console.log("Data =>", data);
    await soWrite(conn, data)
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




