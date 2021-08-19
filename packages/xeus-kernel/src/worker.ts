// worker.js

import createXeusModule from './xeus_dummy';
import { XeusInterpreter } from './xeus_interpreter';

console.log(XeusInterpreter, createXeusModule);

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;
let xeus_raw_interpreter: any;
let xeus_interpreter: XeusInterpreter | undefined;

async function loadCppModule(): Promise<any> {
  return createXeusModule().then((Module: any) => {
    console.log('...createdXeusModule IN WORKER');
    xeus_raw_interpreter = new Module.test_interpreter();
    xeus_interpreter = new XeusInterpreter(xeus_raw_interpreter) 
    console.log('register publisher IN WORKER ....');
    xeus_interpreter.registerPublisher(
      (msg_type: string, metadata_str: string, content_str: string, buffer_sequence: any) => {
        console.log('in publisher lambda IN WORKER');
        rawPublisher(msg_type, JSON.parse(metadata_str), JSON.parse(content_str), buffer_sequence);
      }
    );
    xeus_interpreter.registerStdInSender(
      (msg_type: string, metadata_str: string, content_str: string) => {
        console.log('in stdInSender lambda IN WORKER');
        rawStdInSender(msg_type, JSON.parse(metadata_str), JSON.parse(content_str));
      }
    );
  });
}



const publishExecutionResult = (
  prompt_count: any,
  data: any,
  metadata: any
): void => {
  const bundle = {
    execution_count: prompt_count,
    data: data,
    metadata: metadata
  };
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    bundle,
    type: 'execute_result'
  });
};

const publishStream = (
  data: any,
  metadata: any
): void => {
  const bundle = {
    name: data.name,
    text: data.text,
    metadata: metadata
  };
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    bundle,
    type: 'stream'
  });
};

function rawPublisher(messageType: string, metadata: any, content : any, buffer_sequence:any){
    console.log("in rawPublisher")
    console.log("messageType", messageType)
    console.log("metadata", metadata)
    console.log("content", content)
    console.log("buffer_sequence", buffer_sequence.size())
    switch (messageType) {
        case 'execute_result':
          publishExecutionResult(0, content, metadata)
          break
        case 'stream':

          publishStream(content, metadata)
          break
        default:
          console.log("NOT HANDLED",messageType)
    }
}

function rawStdInSender(messageType: string, metadata: any, content : any){
    console.log("in raw_publisher")
    console.log("messageType", messageType)
    console.log("metadata", metadata)
    console.log("content", content)
}

const loadCppModulePromise = loadCppModule();




// const publishExecutionError = (ename: any, evalue: any, traceback: any): void => {
//   const bundle = {
//     ename: ename,
//     evalue: evalue,
//     traceback: traceback
//   };
//   postMessage({
//     parentHeader: formatResult(kernel._parent_header['header']),
//     bundle,
//     type: 'execute_error'
//   });
// };

// const clearOutputCallback = (wait: boolean): void => {
//   const bundle = {
//     wait: formatResult(wait)
//   };
//   postMessage({
//     parentHeader: formatResult(kernel._parent_header['header']),
//     bundle,
//     type: 'clear_output'
//   });
// };

// const displayDataCallback = (data: any, metadata: any, transient: any): void => {
//   const bundle = {
//     data: formatResult(data),
//     metadata: formatResult(metadata),
//     transient: formatResult(transient)
//   };
//   postMessage({
//     parentHeader: formatResult(kernel._parent_header['header']),
//     bundle,
//     type: 'display_data'
//   });
// };



async function execute(content: any) {
  let res:any = xeus_interpreter!.executeRequest(
    content.code,
    content.silent,
    content.store_history,
    content.user_expressions,
    content.allow_stdin
  )


  return res
}











ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise;

  const data = event.data;

  let results;
  const messageType = data.type;
  const messageContent = data.data;
  let parent_header:any = data.parent;
  xeus_interpreter!.parentHeader = parent_header

  switch (messageType) {
    case 'execute-request':
      results = await execute(messageContent);
      break;

    default:
      break;
    }
  const reply = {
    parentHeader: data.parent['header'],
    type: 'reply',
    results
  };

  postMessage(reply);

};
