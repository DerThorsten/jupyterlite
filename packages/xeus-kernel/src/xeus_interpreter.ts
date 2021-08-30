export class XeusInterpreter {
  xeus_raw_interpreter: any;

  constructor(xeus_raw_interpreter: any) {
    this.xeus_raw_interpreter = xeus_raw_interpreter;
  }

  registerPublisher(publisher: any) {
    this.xeus_raw_interpreter.register_publisher(publisher);
  }
  registerStdInSender(stdInSender: any) {
    this.xeus_raw_interpreter.register_stdin_sender(stdInSender);
  }

  async executeRequestAsync(
    code: string,
    silent: boolean,
    storeHistory: boolean,
    userExpressions: any,
    allowStdin: boolean
  ): Promise<any> {
    const res: any = await this.xeus_raw_interpreter.execute_request(
      code,
      silent,
      storeHistory,
      JSON.stringify(userExpressions),
      allowStdin
    );
    return JSON.parse(res);
  }

  completeRequest(code: string, cursorPos: number): any {
    const res: any = this.xeus_raw_interpreter.complete_request(code, cursorPos);
    return JSON.parse(res);
  }

  kernelInfoRequest(code: string, cursorPos: number): any {
    const res: any = this.xeus_raw_interpreter.kernel_info_request();
    return JSON.parse(res);
  }

  public get parentHeader() {
    return JSON.parse(this.xeus_raw_interpreter.get_parent_header_str());
  }

  public set parentHeader(ph: any) {
    this.xeus_raw_interpreter.set_parent_header_str(JSON.stringify(ph));
  }
  public set input(inputFunc: any) {
    this.xeus_raw_interpreter.set_async_input_func(inputFunc);
  }
}
