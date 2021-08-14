// worker.js

import createXeusModule from './xeus_dummy';
import { XeusInterpreter } from './xeus_interpreter';

console.log(XeusInterpreter, createXeusModule);

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;

let xeus_interpreter: any;

async function loadCppModule(): Promise<any> {
  return createXeusModule().then((Module: any) => {
    console.log('...createdXeusModule IN WORKER');
    xeus_interpreter = new Module.test_interpreter();
    console.log('register publisher IN WORKER ....');
    xeus_interpreter.register_publisher(
      (msg_type: string, metadata: string, content: string, buffer_sequence: any) => {
        console.log('in publisher lambda IN WORKER');
        //this.raw_publisher(msg_type, metadata, content, buffer_sequence);
      }
    );
  });
}

const loadCppModulePromise = loadCppModule();

ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise;
};
// // We send a message back to the main thread
// ctx.addEventListener("message", (event) => {

//     // // Get the limit from the event data
//     // const limit = event.data.limit;

//     console.log("xeus_interpreter",xeus_interpreter)
//     // Send the primes back to the main thread
//     ctx.postMessage({ "a":0 });
// });
