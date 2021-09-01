// worker.js

import createXeusModule from './xeus_lua_kernel';
// import { XeusInterpreter } from './xeus_interpreter';


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


function recive_shell(message: any)
{
    console.log("recive_shell", message)
    const type = message.header.msg_type
    const parent_header = _parentHeader


    switch(type)
    {
      case "execute_reply":
      {
        postMessage({
          parentHeader: _parentHeader,
          content: message.content,
          type: 'execute_reply'
        });
        break;
      }
      case "kernel_info_reply":
      {
        postMessage({
          parentHeader: _parentHeader,
          content : message.content,
          type: 'kernel_info_reply'
        });
        break
      }
      default:{
        console.log("unhandeld in recive_shell in worker", type)
      }
    }


    // postMessage({
    //     type:type,
    //     parentHeader:_parentHeader,
    //     bundle:{
    //       metadata: message.metadata,
    //       data:message.content
    //     }
    // })
}

function recive_control(message: any)
{
    //console.log("recive_control", message)
    const type = message.header.msg_type
    const parent_header = _parentHeader
    postMessage({
        type:type,
        parentHeader:_parentHeader,
        bundle:{
          metadata: message.metadata,
          data:message.content
        }
    })
}

function recive_stdin(message: any)
{
    //console.log("recive_stdin", message)
    const type = message.header.msg_type
    const parent_header = _parentHeader



    postMessage({
        type:type,
        parentHeader:_parentHeader,
        bundle:{
          metadata: message.metadata,
          data:message.content
        }
    })
}

function publish(message: any, channel: string)
{
    console.log("publish", message, channel)

    const type = message.header.msg_type
    const parent_header = _parentHeader

    switch(type)
    {

      // case "status":
      // {
      //   postMessage({type:type, bundle:message.content, parentHeader: _parentHeader})
      //   break
      // }
      case "status":
      case "stream":
      case "display_data":
      case "error":
      {
        postMessage({type:type, bundle: message.content, parentHeader: _parentHeader})
        break
      }
      default:{
        console.log("unhandeld stream in worker", type)
      }
    }
}




async function loadCppModule(): Promise<any> {
  const options: any = {
    // preRun: [
    //   function(module: any) {
    //     module.ENV.LUA_PATH =
    // ]
    //   }
  };

  return createXeusModule(options).then((Module: any) => {
    raw_xkernel = new Module.xkernel();
    raw_xserver =  raw_xkernel.get_server()

    raw_xserver!.register_js_callback((type: string, channel:number, data:any)=>{
      data = JSON.parse(data)
      switch(type)
      {
        case "shell":{
          recive_shell(data)
          break
        }
        case "control":{
          recive_control(data)
          break
        }
        case "stdin":{
          recive_stdin(data)
          break
        }
        case "publish":{
          publish(data, channel == 0 ? "shell" : "control")
          break
        }
      }
    })
    raw_xkernel!.start()
  });
}



const loadCppModulePromise = loadCppModule();


ctx.onmessage = async (event: MessageEvent): Promise<void> => {
  await loadCppModulePromise


  const data = event.data;
  const msg = data.msg 
  console.log("data", data)
  const msg_type = msg.header.msg_type
  if (msg_type !== 'input_reply') {
    _parentHeader = data.parent["header"]
  }
  console.log("parent header in worker", _parentHeader)

  const str_msg = JSON.stringify(msg)
  console.log("on message in worker",msg_type)

  if(msg_type == "input_reply"){
    console.log("resolve the input")
    resolveInputReply(msg.content);
  }
  else{
    const channel = msg.channel
    switch(channel)
    {
      case "shell":
      {
        raw_xserver!.notify_shell_listener(str_msg)
        break
      }
      case "control":
      {
        raw_xserver!.notify_control_listener(str_msg)
        break
      }
      case "stdin":
      {
        raw_xserver!.notify_stdin_listener(str_msg)
        break
      }
      default :
      {
        //alert(channel)
        console.log("channel not found", channel)
      }
    }
  }

  // const reply = {
  //   parentHeader: data.parent['header'],
  //   type: 'reply'
  //   // results
  // };

  // postMessage(reply);
};
