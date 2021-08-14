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


async function execute(content: any) {

  // const res = await kernel.run(content.code);
  // const results = formatResult(res);

  // if (results['status'] === 'error') {
  //   publishExecutionError(results['ename'], results['evalue'], results['traceback']);
  // }

  // return results;

  console.log("executeRequestSync", content)
  let res:any = xeus_interpreter.execute_request(
    content.code,
    content.silent,
    content.store_history,
    JSON.stringify(content.user_expressions),
    content.allow_stdin
  )
  console.log("executeRequestSyncDONE", res)

  return res
}











ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  console.log('...on message',event.data);
  await loadCppModulePromise;

  const data = event.data;

  let results;
  const messageType = data.type;
  const messageContent = data.data;
  //kernel._parent_header = pyodide.toPy(data.parent);


  switch (messageType) {
    case 'execute-request':
      console.log('Perform execution inside worker', data);
      results = await execute(messageContent);
      break;

    default:
      console.log('default', data);
      break;
    }
  const reply = {
    parentHeader: data.parent['header'],
    type: 'reply',
    results
  };

  postMessage(reply);

  console.log('...on message end',event.data);
};
