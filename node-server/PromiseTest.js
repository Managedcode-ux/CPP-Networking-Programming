// let loading = true;

// console.log(loading)

// let promiseWater = new Promise(function (resolve, reject) { //
//   setTimeout(function () {
//     resolve('Hurray! Fetched the Water.')
//     reject(new Error('Jack fell down and broke his crown. And Jill came tumbling after.'));
//   }, 2000)
// })

// const grandParentCooking = () => {
//   promiseWater.then(function (result) {
//     console.log(`cooking rice with the ${result}`)
//   })
//   promiseWater.catch(function (err) {
//     console.log(`OMG ${err.message}`)
//   })
//   promiseWater.finally(() => {
//     loading = false;
//     console.log(loading)
//   })
// }

// grandParentCooking();


//LINKEDIN promise explanation
/*function fetchDataFromAPI() {
  return new Promise((resolve, reject) => {
    fetch("https://api.publicapis.org/entries")
      .then((response) => {
        let JSONdata = response.json()
        console.log('RESPONSE BEFORE BEING CONVERTED TO JSON => ', response)
        console.log('TYPE OF RESPONSE BEFORE BEING CONVERTED TO JSON => ', typeof (response))
        // console.log('RESPONSE AFTER BEING CONVERTED TO JSON => ', response.json())
        return JSONdata;
      })
      .then((data) => {
        let resolvedData = resolve(data)
        console.log("DATA=> ", data)
        console.log("TYPE OF DATA=> ", typeof (data))
        return resolvedData;
      })
      .catch((error) => reject(error));
  })
}



fetchDataFromAPI()
  .then((data) => console.log("Data fetched:", data))
  .catch((error) => console.error("Error fetching data:", error));*/


async function fetchMultipleData() {
  try {
    const response1 = await fetch("https://catfact.ninja/fact");
    const data1 = response1.json()

    const response2 = await fetch("https://www.boredapi.com/api/activity");
    const data2 = await response2.json()

    return [data1, data2]
  }
  catch (err) {
    throw new Error(err)
  }
}

fetchMultipleData()
  .then((results) => console.log("Data Fetched:- ", results))
  .catch(err => console.log(err))