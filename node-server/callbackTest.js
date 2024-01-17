// const message = function () {
//   console.log("The message is shown after 3 sec")
// }

// setTimeout(message, 3000)


//anonymous callback function
/*function processThis(message, callback) {
  console.log("Running the function first with this message : " + message)
  if (typeof callback == 'function') {
    callback();
  }
}

processThis("Hello World", function callbackFunction() {
  console.log("This is a callback function")
})*/

//non-anonymous callback function
function processThis(message, callback) {
  console.log("Running the first with message: " + message)

  if (typeof callback == 'function')
    callback();
}

function callBackFunction() {
  console.log("Running the callback function")
}

processThis("Hello World", callBackFunction)