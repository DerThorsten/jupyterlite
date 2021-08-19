export class XeusInterpreter {
  xeus_raw_interpreter: any;

  constructor(xeus_raw_interpreter: any) {
    this.xeus_raw_interpreter = xeus_raw_interpreter;
  }

  registerPublisher(publisher:any){
    this.xeus_raw_interpreter.register_publisher(publisher)
  }
  registerStdInSender(stdInSender:any){
    this.xeus_raw_interpreter.register_stdin_sender(stdInSender)
  }
  
  executeRequest(code: string, silent:boolean, storeHistory: boolean, userExpressions:any, allowStdin:boolean): any{
    let res:any = this.xeus_raw_interpreter.execute_request(
      code,
      silent,
      storeHistory,
      JSON.stringify(userExpressions),
      allowStdin
    )
    return JSON.parse(res);
  }

  public get parentHeader() {
    return JSON.parse(this.xeus_raw_interpreter.get_parent_header_str());
  }

  public set parentHeader(ph: any) {
    this.xeus_raw_interpreter.set_parent_header_str(JSON.stringify(ph))
  }
}
