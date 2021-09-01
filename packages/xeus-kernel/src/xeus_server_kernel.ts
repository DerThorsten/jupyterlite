import { KernelMessage } from '@jupyterlab/services';
import { IKernel } from '@jupyterlite/kernel';
import { ISignal, Signal } from '@lumino/signaling';

import { PromiseDelegate } from '@lumino/coreutils';

// import createXeusModule from './xeus_dummy';
// import {XeusInterpreter} from './xeus_interpreter';

import XeusWorker from 'worker-loader!./worker';

export class XeusServerKernel implements IKernel {
  /**
   * Instantiate a new XeusServerKernel
   *
   * @param options The instantiation options for a new XeusServerKernel
   */

  xeus_interpreter: any;
  constructor(options: XeusServerKernel.IOptions) {

    const { id, name, sendMessage } = options;
    this._id = id;
    this._name = name;
    this._sendMessage = sendMessage;
    console.log("ID", id)
    this._worker = new XeusWorker();
    this._worker.onmessage = e => {
      this._processWorkerMessage(e.data);
    };
  }


  async handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    //this._busy(msg);
    //this._busy(msg);
    this._parent = msg;
    console.log("THE        SID IN HANDLE MESSAGE",msg.header.session,msg)
    

    await this._sendMessageToWorker(msg)
    
  }


  private async _sendMessageToWorker(msg: any): Promise<void> {
    console.log("SEND TO WORKER",msg.header.msg_type)
    if(msg.header.msg_type == "execute_request"){
      console.log("update parent header to execture_request msg header")
      this._parentHeader = msg.header;
    }
    if(msg.header.msg_type != "input_reply"){
      this._executeDelegate = new PromiseDelegate<void>();
    }
    this._worker.postMessage({msg, parent:this.parent});
    //console.log("await execute _executeDelegate")
    if(msg.header.msg_type != "input_reply"){
      return await this._executeDelegate.promise;
    }
  }


  /**
   * Send a 'busy' status message.
   *
   * @param parent The parent message.
   */
  private _busy(parent: KernelMessage.IMessage): void {
    const message = KernelMessage.createMessage<KernelMessage.IStatusMsg>({
      msgType: 'status',
      session: parent.header.session,
      parentHeader: parent.header,
      channel: 'iopub',
      content: {
        execution_state: 'busy'
      }
    });
    console.log("send buisy msg",message);
    this._sendMessage(message);
  }

  private _idle(parent: KernelMessage.IMessage): void {
    const message = KernelMessage.createMessage<KernelMessage.IStatusMsg>({
      msgType: 'status',
      session: parent.header.session,
      parentHeader: parent.header,
      channel: 'iopub',
      content: {
        execution_state: 'idle'
      }
    });
    console.log("send idle msg",message);
    this._sendMessage(message);
  }

  private status(content: any, parent_header:any): void {
    const message = KernelMessage.createMessage<KernelMessage.IStatusMsg>({
      msgType: 'status',
      session: parent_header.session ?? '',
      parentHeader: parent_header,
      channel: 'iopub',
      content: content
    });
    console.log("send status=>", message);
    this._sendMessage(message);
  }



  /**
   * Get the last parent header
   */
  get parentHeader(): KernelMessage.IHeader<KernelMessage.MessageType> | undefined {
    return this._parentHeader;
  }

  /**
   * Get the last parent message (mimick ipykernel's get_parent)
   */
  get parent(): KernelMessage.IMessage | undefined {
    return this._parent;
  }
  /**
   * Stream an event from the kernel
   *
   * @param parentHeader The parent header.
   * @param content The stream content.
   */
  protected stream(content: KernelMessage.IStreamMsg['content']): void {
    const message = KernelMessage.createMessage<KernelMessage.IStreamMsg>({
      channel: 'iopub',
      msgType: 'stream',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send a `display_data` message to the client.
   *
   * @param content The display_data content.
   */
  protected displayData(content: KernelMessage.IDisplayDataMsg['content']): void {
    // Make sure metadata is always set
    content.metadata = content.metadata ?? {};

    const message = KernelMessage.createMessage<KernelMessage.IDisplayDataMsg>({
      channel: 'iopub',
      msgType: 'display_data',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send a `input_request` message to the client.
   *
   * @param content The input_request content.
   */
  protected inputRequest(content: KernelMessage.IInputRequestMsg['content']): void {
    const message = KernelMessage.createMessage<KernelMessage.IInputRequestMsg>({
      channel: 'stdin',
      msgType: 'input_request',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send an `execute_result` message.
   *
   * @param content The execut result content.
   */
  protected publishExecuteResult(
    content: KernelMessage.IExecuteResultMsg['content']
  ): void {
    const message = KernelMessage.createMessage<KernelMessage.IExecuteResultMsg>({
      channel: 'iopub',
      msgType: 'execute_result',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send an `error` message to the client.
   *
   * @param content The error content.
   */
  protected publishExecuteError(content: KernelMessage.IErrorMsg['content']): void {
    const message = KernelMessage.createMessage<KernelMessage.IErrorMsg>({
      channel: 'iopub',
      msgType: 'error',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send a `update_display_data` message to the client.
   *
   * @param content The update_display_data content.
   */
  protected updateDisplayData(
    content: KernelMessage.IUpdateDisplayDataMsg['content']
  ): void {
    const message = KernelMessage.createMessage<KernelMessage.IUpdateDisplayDataMsg>({
      channel: 'iopub',
      msgType: 'update_display_data',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send a `clear_output` message to the client.
   *
   * @param content The clear_output content.
   */
  protected clearOutput(content: KernelMessage.IClearOutputMsg['content']): void {
    const message = KernelMessage.createMessage<KernelMessage.IClearOutputMsg>({
      channel: 'iopub',
      msgType: 'clear_output',
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content
    });
    this._sendMessage(message);
  }

  /**
   * Send a `comm` message to the client.
   *
   * @param .
   */
  protected handleComm(
    type: 'comm_close' | 'comm_msg' | 'comm_open',
    content: KernelMessage.ICommMsgMsg['content'],
    metadata: KernelMessage.ICommMsgMsg['metadata'],
    buffers: KernelMessage.ICommMsgMsg['buffers']
  ): void {
    const message = KernelMessage.createMessage<any>({
      channel: 'iopub',
      msgType: type,
      // TODO: better handle this
      session: this._parentHeader?.session ?? '',
      parentHeader: this._parentHeader,
      content,
      metadata,
      buffers
    });
    this._sendMessage(message);
  }


  /**
   * Process a message coming from the pyodide web worker.
   *
   * @param msg The worker message to process.
   */
  private _processWorkerMessage(msg: any): void {
    console.log("message from the worker", msg)

    switch (msg.type) {
      case 'status': {
        this.status(msg.bundle, msg.parentHeader)
        if(msg.bundle.execution_state == "idle")
        {
            console.log("RESOLVING!")
            this._executeDelegate.resolve();
        }
        break
      }
      case 'kernel_info_reply':
      {
        const message = KernelMessage.createMessage<KernelMessage.IInfoReplyMsg>({
          msgType: 'kernel_info_reply',
          channel: 'shell',
          session: msg.parentHeader.session,
          parentHeader: msg.parentHeader as KernelMessage.IHeader<'kernel_info_request'>,
          content: msg.content
        });
        this._sendMessage(message);
        break
      }
      case 'stream': {
        const bundle = msg.bundle ?? { name: 'stdout', text: '' };
        this.stream(bundle);
        break;
      }
      case 'input_request': {
        const bundle = msg.content ?? { prompt: '', password: false };
        this.inputRequest(bundle);
        break;
      }

      case 'reply': {
        const bundle = msg.results;
        break;
      }
      case 'display_data': {
        const bundle = msg.bundle ?? { data: {}, metadata: {}, transient: {} };
        this.displayData(bundle);
        break;
      }
      case 'update_display_data': {
        const bundle = msg.bundle ?? { data: {}, metadata: {}, transient: {} };
        this.updateDisplayData(bundle);
        break;
      }
      case 'clear_output': {
        const bundle = msg.bundle ?? { wait: false };
        this.clearOutput(bundle);
        break;
      }
      case 'execute_reply':
      {
         const message = KernelMessage.createMessage<KernelMessage.IExecuteReplyMsg>({
          msgType: 'execute_reply',
          channel: 'shell',
          session: this._parentHeader?.session ?? '',
          parentHeader: msg.parentHeader, //as KernelMessage.IHeader<'execture_request'>,
          content: msg.content
        });
        console.log("THE CONTENT", msg.content)
        console.log("session from parentHeader",     this._parentHeader?.session)
        console.log("session from msg.parentHeader", msg.parentHeader)
        console.log("the execture reply msg", message)
        this._sendMessage(message);
      }
      case 'execute_result': {
        const bundle = msg.bundle ?? { execution_count: 0, data: {}, metadata: {} };
        console.log("the bundle",bundle)
        this.publishExecuteResult(bundle);
        break;
      }
      case 'error': 
      case 'execute_error': {
        const bundle = msg.bundle ?? { ename: '', evalue: '', traceback: [] };
        this.publishExecuteError(bundle);
        break;
      }
      case 'comm_msg':
      case 'comm_open':
      case 'comm_close': {
        this.handleComm(msg.type, msg.content, msg.metadata, msg.buffers);
        break;
      }
      default:
        // console.log("RESOLVING!")
        // this._executeDelegate.resolve({
        //   data: {},
        //   metadata: {}
        // });
        break;
    }
  }


  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    return Promise.resolve();
  }


  /**
   * Return whether the kernel is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }
  /**
   * A signal emitted when the kernel is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Dispose the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit(void 0);
  }

  /**
   * Get the kernel id
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the name of the kernel
   */
  get name(): string {
    return this._name;
  }


  private _id: string;
  private _name: string;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _worker: Worker;
  private _sendMessage: IKernel.SendMessage;
  private _executeDelegate = new PromiseDelegate<void>();
  private _parentHeader:
    | KernelMessage.IHeader<KernelMessage.MessageType>
    | undefined = undefined;
  private _parent: KernelMessage.IMessage | undefined = undefined;
}

/**
 * A namespace for XeusServerKernel statics.
 */
export namespace XeusServerKernel {
  /**
   * The instantiation options for a Pyodide kernel
   */
  export interface IOptions extends IKernel.IOptions {}
}
