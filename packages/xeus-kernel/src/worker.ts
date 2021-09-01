// worker.js

import createXeusModule from './xeus_lua_kernel';
// import { XeusInterpreter } from './xeus_interpreter';


// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;
let raw_xkernel: any;
let raw_xserver: any;
let _parentHeader: any;



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
  postMessage({
    parentHeader: _parentHeader,
    content,
    type: 'input_request'
  });
}


// eslint-disable-next-line
// @ts-ignore: breaks typedoc
ctx.async_get_input_function = async_get_input_function;




// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let resolveInputReply: any;

async function loadCppModule(): Promise<any> {
  const options: any = {
    // preRun: [
    //   function(module: any) {
    //     module.ENV.LUA_PATH =
    //       '/asset_dir/lua_packages/?.lua;/asset_dir/lua_packages/?/init.lua';
    //   }
    // ]
  };

  return createXeusModule(options).then((Module: any) => {
    raw_xkernel = new Module.xkernel();
    raw_xserver =  raw_xkernel.get_server()
    // register stuff
    console.log("\n\n\nREGISTER\n\n")
    raw_xserver!.register_js_callback((type: string, channel:number, data:any)=>{
      console.log("js_callback", type,channel,data)
    })
    console.log("\n\n\nREGISTER\n\n")
  
  });


}



const loadCppModulePromise = loadCppModule();


ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise


  const data = event.data;
  _parentHeader = data.parent["header"]

  const msg = data.msg 
  const str_msg = JSON.stringify(msg)
  console.log("on message in worker")

  const channel = msg.channel
  console.log("channel",channel)
  switch(channel)
  {
    case "shell":
    {
      raw_xserver!.notify_shell_listener(str_msg)
      break
    }
  }

  const reply = {
    parentHeader: data.parent['header'],
    type: 'reply'
    // results
  };

  postMessage(reply);
};
