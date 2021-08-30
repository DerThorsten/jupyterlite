// worker.js

import createXeusLuaModule from './xeus_lua';
import { XeusInterpreter } from './xeus_interpreter';

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;
let xeus_raw_interpreter: any;
let xeus_interpreter: XeusInterpreter | undefined;

async function async_get_input_function(prompt: string) {
  prompt = typeof prompt === 'undefined' ? '' : prompt;
  await sendInputRequest({ prompt: prompt, password: false });
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  const result: any = await replyPromise;
  return result['value'];
}

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
ctx.async_get_input_function = async_get_input_function;

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let resolveInputReply: any;

async function loadCppModule(): Promise<any> {
  const options: any = {
    preRun: [
      function(module: any) {
        module.ENV.LUA_PATH =
          '/asset_dir/lua_packages/?.lua;/asset_dir/lua_packages/?/init.lua';
      }
    ]
  };

  return createXeusLuaModule(options).then((Module: any) => {
    xeus_raw_interpreter = new Module.xlua_interpreter();
    xeus_interpreter = new XeusInterpreter(xeus_raw_interpreter);

    //xeus_interpreter.input = input

    xeus_interpreter.registerPublisher(
      (
        msg_type: string,
        metadata_str: string,
        content_str: string,
        buffer_sequence: any
      ) => {
        rawPublisher(
          msg_type,
          JSON.parse(metadata_str),
          JSON.parse(content_str),
          buffer_sequence
        );
      }
    );
    xeus_interpreter.registerStdInSender(
      (msg_type: string, metadata_str: string, content_str: string) => {
        rawStdInSender(msg_type, JSON.parse(metadata_str), JSON.parse(content_str));
      }
    );
  });
}

const publishExecutionResult = (prompt_count: any, data: any, metadata: any): void => {
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

const publishExecutionError = (data: any, metadata: any): void => {
  const bundle = {
    ename: data.ename,
    evalue: data.evalue,
    traceback: data.traceback
  };
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    bundle,
    type: 'execute_error'
  });
};

const publishStream = (data: any, metadata: any): void => {
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

const displayData = (data: any, metadata: any): void => {
  console.log(data, metadata);
  const bundle = {
    data: data.data,
    metadata: data.metadata,
    transient: data.transient
  };
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    bundle,
    type: 'display_data'
  });
};

// const updateDisplayDataCallback = (
//   data: any,
//   metadata: any,
//   transient: any
// ): void => {
//   const bundle = {
//     data: formatResult(data),
//     metadata: formatResult(metadata),
//     transient: formatResult(transient)
//   };
//   postMessage({
//     parentHeader: formatResult(kernel._parent_header['header']),
//     bundle,
//     type: 'update_display_data'
//   });
// };

async function sendInputRequest(content: any) {
  postMessage({
    parentHeader: xeus_interpreter!.parentHeader['header'],
    content,
    type: 'input_request'
  });
}

function rawPublisher(
  messageType: string,
  metadata: any,
  content: any,
  buffer_sequence: any
) {
  switch (messageType) {
    case 'execute_result':
      publishExecutionResult(0, content, metadata);
      break;

    case 'stream':
      publishStream(content, metadata);
      break;

    case 'error':
      publishExecutionError(content, metadata);
      break;

    case 'display_data':
      displayData(content, metadata);
      break;

    default:
      console.log('NOT HANDLED', messageType);
  }
}

function rawStdInSender(messageType: string, metadata: any, content: any) {
  switch (messageType) {
    case 'input_request':
      //sendInputRequest(content)
      break;

    default:
      console.log('NOT HANDLED', messageType);
  }
}

const loadCppModulePromise = loadCppModule();

async function execute(content: any) {
  const res: any = await xeus_interpreter!.executeRequestAsync(
    content.code,
    content.silent,
    content.store_history,
    content.user_expressions,
    content.allow_stdin
  );

  return res;
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

  let results;
  const messageType = data.type;
  const messageContent = data.data;
  const parent_header: any = data.parent;
  if (data.type !== 'input-reply') {
    xeus_interpreter!.parentHeader = parent_header;
  }
  switch (messageType) {
    case 'execute-request':
      results = await execute(messageContent);

      break;
    case 'complete-request':
      results = complete(messageContent);
      break;
    case 'input-reply':
      resolveInputReply(messageContent);
      return;
    default:
      console.log('unhandled', messageType);
      break;
  }

  const reply = {
    parentHeader: data.parent['header'],
    type: 'reply',
    results
  };

  postMessage(reply);
};
