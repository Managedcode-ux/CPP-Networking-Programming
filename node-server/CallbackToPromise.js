const fs = require('node:fs')

//synchronouse version
try {
  const data = fs.readFileSync(path, 'UTF8')
  console.log(data)
} catch (err) {
  console.log(err)
}

// ASYNCHRONOUS VERSION
fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.log(error);
  }
  console.log(data)
})

//SELF CODED PROMISE BASED VERSION
function readFilePromise(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else resolve(data)
    })
  })
}






