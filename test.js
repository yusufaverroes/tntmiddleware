import {Mutex} from 'async-mutex'
import { EventEmitter } from 'events';
const mutex = new Mutex();
const events = new EventEmitter();
import { serverIsDead } from './utils/globalEventEmitter.js';
// async function test() {
//     const release =  await mutex.acquire();
//     return new Promise((resolve, reject) => {
//         console.log("waiting for an event");
//         let timeout = setTimeout(()=>{
//             console.log("timed out")
            
//             resolve();
//             release();
//         },5000)
//         function nestedFunc(yuhu="uhuk"){
//             clearTimeout(timeout)
//             console.log("got event here",yuhu)
            
//             resolve();
//             release();
//         }
//         events.on("foo",(haha)=>{nestedFunc(haha)})

//     })
//   }

// setTimeout(()=>{
//     events.emit("foo", "hello");
// },2000)

//  test();
// test();
//  test();
//  test();

// function colekdong(namanya){
//     console.log(`colek ${namanya} ah`)
// }

// let interval = setInterval(()=>{
//     events.emit("colek lah", "rizal")
// }, 1000)

// events.once("colek lah", (nama)=>{
//     colekdong(nama)
// })

let testInterval = setInterval(()=>{
    console.log("hello 1")
},1000)
 testInterval = setInterval(()=>{
    console.log("hello 2")
},2000)

setTimeout(()=>{
    clearInterval(testInterval)
    clearInterval(testInterval)
    console.log("interval is cleared")
},10000)