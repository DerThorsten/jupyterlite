export class XeusInterpreter {
  xeus_raw_interpreter: any;

  constructor(xeus_raw_interpreter: any) {
    this.xeus_raw_interpreter = xeus_raw_interpreter;
  }

  //executeRequest(content: KernelMessage.IExecuteRequestMsg['content']): any
}
