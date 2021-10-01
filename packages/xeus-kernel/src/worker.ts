import createXeusModule from './xeus_lua_kernel';

console.log("CREATED THE WORKER")





// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;
let raw_xkernel: any;
let raw_xserver: any;
let _parentHeader: any;
let _sessionId : any;

async function async_get_input_function(prompt: string) {
  prompt = typeof prompt === 'undefined' ? '' : prompt;
  await sendInputRequest({ prompt: prompt, password: false });
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  const result: any = await replyPromise;
  return result['value'];
}

async function sendInputRequest(content: any) {
  ctx.postMessage({
    parentHeader: _parentHeader,
    content,
    type: 'special_input_request'
  });
}

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
ctx.async_get_input_function = async_get_input_function;

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let resolveInputReply: any;


function postMessageToWorker(message:any, channel:string)
{
  message.channel = channel
  message.type = message.header.msg_type
  message.parent_header = _parentHeader
  ctx.postMessage(message)
}


async function loadCppModule(moduleFactory: any): Promise<any> {
  const options: any = {
  };

  return moduleFactory(options).then((Module: any) => {
    raw_xkernel = new Module.xkernel();
    raw_xserver =  raw_xkernel.get_server()

    raw_xserver!.register_js_callback((type: string, channel:number, data:any)=>{
      data = JSON.parse(data)
      switch(type)
      {
        case "shell":{
          postMessageToWorker(data, "shell") 
          break
        }
        case "control":{
          throw new Error('send_control is not yet implemented');
          break
        }
        case "stdin":{
          postMessageToWorker(data, "stdin")
          break
        }
        case "publish":{
          // TODO ask what to do with channel
          postMessageToWorker(data, "iopub")
          break
        }
      }
    })
    raw_xkernel!.start()
  });
}

const loadCppModulePromise = loadCppModule(createXeusModule);

ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise


  const data = event.data;
  const msg = data.msg 
  const msg_type = msg.header.msg_type

  if (msg_type !== 'input_reply'  && msg_type !== "__import__") {
    _parentHeader = data.parent["header"]
  }

  if(msg_type == "input_reply"){
    resolveInputReply(msg.content);
  }
  else if(msg_type == "__import__"){
    // const p = msg.content.package_path
    // await import(p)
  }
  else{
    const channel = msg.channel
    const str_msg = JSON.stringify(msg)
    raw_xserver!.notify_listener(str_msg,  msg.channel)
  }
};
