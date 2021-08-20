// worker.js

import createXeusLuaModule from './xeus_lua';
import { XeusInterpreter } from './xeus_interpreter';

console.log(XeusInterpreter, createXeusLuaModule);

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;
let xeus_raw_interpreter: any;
let xeus_interpreter: XeusInterpreter | undefined;


async function input(prompt: string) {
  console.log("in the async func")
  prompt = typeof prompt === 'undefined' ? '' : prompt;
  console.log("await sendInputRequest")
  await sendInputRequest({promt:prompt, password:false});
  console.log("await sendInputRequest DONE")
  const replyPromise = new Promise(resolve => {
    console.log("in resolve",resolve)
    resolveInputReply = resolve;
  });
  console.log("await replyPromise")
  const result: any = await replyPromise;
  console.log("the result",result, result['value'])
  return result['value'];
  //return "yay"
}

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
ctx.theFunc = input;

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let resolveInputReply: any;

async function loadCppModule(): Promise<any> {
  return createXeusLuaModule().then((Module: any) => {
    console.log('...createdXeusModule IN WORKER');
    xeus_raw_interpreter = new Module.xlua_interpreter();
    xeus_interpreter = new XeusInterpreter(xeus_raw_interpreter) 

    console.log('set input IN WORKER ....');
    xeus_interpreter.input = input

    console.log('register publisher IN WORKER ....');
    xeus_interpreter.registerPublisher(
      (msg_type: string, metadata_str: string, content_str: string, buffer_sequence: any) => {
        console.log('in publisher lambda IN WORKER');
        rawPublisher(msg_type, JSON.parse(metadata_str), JSON.parse(content_str), buffer_sequence);
      }
    );
    console.log('register registerStdInSender IN WORKER ....');
    xeus_interpreter.registerStdInSender(
      (msg_type: string, metadata_str: string, content_str: string) => {
        console.log('in stdInSender lambda IN WORKER');
        rawStdInSender(msg_type, JSON.parse(metadata_str), JSON.parse(content_str));
      }
    );

  });
}


// async function getpass(prompt: string) {
//   prompt = typeof prompt === 'undefined' ? '' : prompt;
//   await sendInputRequest(prompt, true);
//   const replyPromise = new Promise(resolve => {
//     resolveInputReply = resolve;
//   });
//   const result: any = await replyPromise;
//   return result['value'];
// }


console.log(input)

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

const publishExecutionError = (
  data: any,
  metadata: any
): void => {
  const bundle = {
    ename: data.ename,
    evalue: data.evalue,
    traceback: data.traceback,
  };
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    bundle,
    type: 'execute_error'
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


async function  sendInputRequest(
  content: any
){
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    content,
    type: 'input_request'
  });
};

console.log(sendInputRequest)

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

        case 'error':
          publishExecutionError(content, metadata)
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
    switch (messageType) {
        case 'input_request':
          //sendInputRequest(content)
          break

        default:
          console.log("NOT HANDLED",messageType)
    }
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

  // 


  console.log("silent?",content.silent)
  let res:any = await xeus_interpreter!.executeRequestAsync(
    content.code,
    content.silent,
    content.store_history,
    content.user_expressions,
    content.allow_stdin
  )


  return res
}



/**
 * Complete the code submitted by a user.
 *
 * @param content The incoming message with the code to complete.
 */
function complete(content: any) {
  //xeus_interpreter!.input = input
  const res = xeus_interpreter!.completeRequest(content.code, content.cursor_pos);
  return res;
}








ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise;

  const data = event.data;

  console.log("on message",data.type, data)

  let results;
  const messageType = data.type;
  const messageContent = data.data;
  let parent_header:any = data.parent;
  console.log("set parent header")
  if(data.type != "input-reply")
  {
    xeus_interpreter!.parentHeader = parent_header
  }
  console.log("switch")
  switch (messageType) {
    case 'execute-request':
      results = await execute(messageContent);
      console.log("the results",results)
      break;
    case 'complete-request':
      results = complete(messageContent);
      break;
    case 'input-reply':
      console.log('input-reply',messageContent)
      resolveInputReply(messageContent);
      return;
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
