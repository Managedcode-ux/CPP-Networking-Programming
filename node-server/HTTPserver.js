// parsed http request headers
const HTTPReq = {
  method,
  uri,
  version,
  headers
}

// an http response
const HTTPRes = {
  code,
  headers,
  body,
}

// an interface for reading/writing data from/to the HTTP body.
const BodyReader = {
  // the "Content-Length", -1 if unknown.
  length,
  // read data. returns an empty buffer after EOF.
  read
}

//max Lenght of the http header
const kMaxHeaderLen = 1024 * 8;

function splitLines() { }

function parseRequsetLine() { }

function parseHTTPReq(data) {
  //split the data into lines
  const lines = splitLines(data)
  //first line is 'METHOD URI VERSION'
  const [method, uri, version] = parseRequestLine(lines[0])
  //followed by header fiels in the format of 'Name:value'
  const headers = [];
  for (let i = 1; i < lines.length - 1; i++) {
    const h = Buffer.from(lines[i]);
    if (!validataHeaders(h)) {
      throw new HTTPError(400, 'Bad Fields');
    }
    headers.push(h)
  }

  //headers end by the empty lines
  console.assert(lines[lines.length - 1].length === 0);

  return {
    method: method,
    uri: uri,
    version: version,
    headers: headers
  }
}

//parse & remove a header from the beginnig of the buffer if possible
function cutMessage(buf) {
  //the end of the header is marked by '\r\n\r\n'
  const idx = buf.data.subarray(0, buf.length).indexOf('\r\n\r\n');

  if (idx < 0) {
    if (buf.length >= kMaxHeaderLen) {
      throw new HTTPError(413, 'Header is too large');
    }
    return null;
  }
  // parse & remove the header
  const msg = parseHTTPReq(buf.data.subarray(0, idx + 4));
  bufPop(buf, idx + 4);
  return msg;
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


// BodyReader from an HTTP Request
function readerFromReq(conn, buf, req) {
  let bodyLen = -1;
  const contentLen = fieldGet(req.headers, 'Content-length');
  if (contentLen) {
    bodyLen = parseDec(contentLen.toString('latin1'));
    if (isNaN(bodyLen)) {
      throw new HTTPError(400, 'Bad Content-length');
    }
  }

  const bodyAllowed = !(req.method === 'GET' || req.method === 'HEAD');
  const chunked = fieldGet(req.headers, 'Transfer-Encoding')?.equals(Buffer.from('chunked')) || false;

  if (!bodyAllowed && (bodyLen > 0 || chunked)) {
    throw new HTTPError(400, 'HTTP body not allowed');
  }

  if (!bodyAllowed) {
    bodyLen = 0;
  }

  if (bodyLen >= 0) {
    //"content-lenght" is present
    return readerFromConnLength(conn, buf, bodyLen)
  }

  else if (chunked) {
    //chunked Encoding is present
    throw new HTTPError(500, 'TODO');
  }
  else {
    // read the rest of the connection
    throw new HTTPError(501, 'TODO');
  }
}

function readerFromConnLength(conn, buf, remain,) {
  return {
    length: remain,
    read: async () => {
      if (remain === 0) {
        return Buffer.from(''); //done
      }
      if (buf.length === 0) {
        //try to get some data if there is none
        const data = await soRead(data);
        bufPush(buf, data);
        if (data.length === 0) {
          //expect more data
          throw new Error('Unexpected EOF from HTTP body');
        }
      }

      //consume the data from the buffer
      const consume = Math.min(buf.length, remain)
      remain -= consume;
      const data = Buffer.from(buf.data.subarray(0, consume));
      bufPop(buf, consume);
      return data;
    }
  }
}

//body reader for inMemory Data
function readerFromMemory(data) {
  let done = false;
  return {
    length: data.length,
    read: async () => {
      if (done) {
        return Buffer.from(''); //no more data
      } else {
        done = true;
        return data;
      }
    }
  }
}


async function handleReq(req, body) {
  //act on the request URI
  let resp;
  switch (req.uri.toString('latin1')) {
    case '/echo':
      //http echo server
      resp = body;
      break;
    default:
      resp = readerFromMemory(Buffer.from('hello world \n'));
      break;
  }

  return {
    code: 200,
    headers: [Buffer.from('Server: HTTP_Server')],
    body: resp
  }
}

async function writeHTTPResp(conn, resp) {
  if (resp.body.length < 0) {
    throw new Error('TODO:"Chunked Encoding"');
  }

  //set the 'Content-Length' field
  console.assert(!fieldGet(resp.headers, 'Content-Length'));

  resp.headers.push(Buffer.from(`Content-Length:${resp.body.length}`));
  //write the header
  await soWrite(conn, encodeHTTPResp(resp));
  //write the body
  while (true) {
    const data = await resp.body.read();
    if (data.length === 0) {
      break;
    }
    await soWrite(conn, data);
  }
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

async function serverClient(conn) {
  const buf = { data: Buffer.alloc(0), length: 0 };
  while (true) {
    // try to get 1 request header from the buffer
    const msg = cutMessage(buf);
    if (!msg) {
      // need more data
      const data = await soRead(conn);
      bufPush(buf, data);
      // EOF?
      if (data.length === 0 && buf.length === 0) {
        return; // no more requests
      }

      if (data.length === 0) {
        throw new HTTPError(400, "Unexpected EOF");
      }
      // got some data, try it again.
      continue;
    }
    //process the message and send the responce

    const reqBody = readerFromReq(conn, buf, msg);
    const res = await handleReq(msg, reqBody)

    await writeHTTPResp(conn, res);
    //close the connection for http 1.0;
    if (msg.version === '1.0') {
      return;
    }
    // make sure the request body is consumed quickly
    while ((await reqBody.read()).length > 0) {

    }
  }
}

async function newConn(socket) {
  const conn = soInit(socket);

  try {
    await serverClient(conn);
  } catch (exc) {
    console.error('Exception :', exc);

    if (exc instanceof HTTPError) {
      //intented to send an error response
      const resp = {
        code: exc.code,
        headers: [],
        body: readerFromMemory(Buffer.from(exc.message + '\n'))
      };

      try {
        await writeHTTPResp(conn, resp)
      } catch (exc) {/* IGNORE*/ }
    }
  } finally {
    socket.destroy();
  }
}