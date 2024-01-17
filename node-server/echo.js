// STEP 1 :- Create a Listening Socket

import * as net from 'net'

let server = net.createServer({ allowHalfOpen: true });

// console.log("TYPE OF SERVER ==>", typeof (server))
// console.log(server)
server.on('error', (err) => { throw err })
server.on('connection', newConn)
server.listen({ host: '127.0.0.1', port: 1234 })



//  STEP 2 :- Accepting New Connections
function newConn(socket) {
  console.log("New Connection ", socket.remoteAddress, socket.remotePort)

  socket.on('end', () => {
    // FIN Recived the connection will be automatically closed
    console.log('EOF')
  })
  socket.on('data', (data) => {
    console.log('data: ', data)
    socket.write(data) //echo back data

    //close connection if 'q' string is recived
    if (data.includes('q')) {
      console.log('closing')
      socket.end();
    }
  })
}