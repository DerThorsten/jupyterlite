import { KernelMessage } from '@jupyterlab/services';

import { BaseKernel, IKernel } from '@jupyterlite/kernel';

import { PromiseDelegate } from '@lumino/coreutils';

// import createXeusModule from './xeus_dummy';
// import {XeusInterpreter} from './xeus_interpreter';

import XeusWorker from "worker-loader!./worker";


// console.log(XeusInterpreter)

export class XeusKernel extends BaseKernel implements IKernel {
  /**
   * Instantiate a new XeusKernel
   *
   * @param options The instantiation options for a new XeusKernel
   */

  xeus_interpreter: any;
  constructor(options: XeusKernel.IOptions) {
    super(options);


    console.log("create worker")
    this._worker = new XeusWorker();
    console.log("create worker DONE")
    console.log(this._worker)
    this._worker.onmessage = e => {
      this._processWorkerMessage(e.data);
    };
    console.log(this._worker,XeusWorker)
  }

  /**
   * Dispose the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    console.log(`Dispose worker for kernel ${this.id}`);
    super.dispose();
  }

  raw_publisher(msg_type:string, metadata:string, content:string, buffer_sequence:any) : void {
    console.log(`msg_type ${msg_type}`);
    console.log(`metadata ${metadata}`);
    console.log(`content ${content}`);
    console.log(`buffer_sequence ${buffer_sequence.size()}`);
    for (var i = 0; i < buffer_sequence.size(); i++) {
      console.log('Vector Value: ', buffer_sequence.get(i));
    }
  }

  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  // get ready(): Promise<void> {
  //   return this._ready.promise;
  // }

 /**
   * Process a message coming from the pyodide web worker.
   *
   * @param msg The worker message to process.
   */
  private _processWorkerMessage(msg: any): void {
    console.log("message from worker",msg)
    switch (msg.type) {
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
        this._executeDelegate.resolve(bundle);
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
      case 'execute_result': {
        const bundle = msg.bundle ?? { execution_count: 0, data: {}, metadata: {} };
        this.publishExecuteResult(bundle);
        break;
      }
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
        this._executeDelegate.resolve({
          data: {},
          metadata: {}
        });
        break;
    }
  }
  
  /**
   * Handle a kernel_info_request message
   */
  async kernelInfoRequest(): Promise<KernelMessage.IInfoReplyMsg['content']> {
    const content: KernelMessage.IInfoReply = {
      implementation: 'xeus',
      implementation_version: '0.1.0',
      language_info: {
        codemirror_mode: {
          name: 'python',
          version: 3
        },
        file_extension: '.py',
        mimetype: 'text/x-python',
        name: 'python',
        nbconvert_exporter: 'python',
        pygments_lexer: 'ipython3',
        version: '3.8'
      },
      protocol_version: '5.3',
      status: 'ok',
      banner: 'Xeus: A WebAssembly-powered dummy kernel backed by xeus',
      help_links: [
        {
          text: 'Python (WASM) Kernel',
          url: 'https://xeus.org'
        }
      ]
    };
    return content;
  }

  /**
   * Handle an `execute_request` message
   *
   * @param msg The parent message.
   */
  async executeRequest(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<KernelMessage.IExecuteReplyMsg['content']> {
    
    console.log("send to worker", content)
    const result = await this._sendRequestMessageToWorker('execute-request', content);
    console.log("send to worker done")
    return {
      execution_count: this.executionCount,
      ...result
    };
  }

  /**
   * Handle an complete_request message
   *
   * @param msg The parent message.
   */
  async completeRequest(
    content: KernelMessage.ICompleteRequestMsg['content']
  ): Promise<KernelMessage.ICompleteReplyMsg['content']> {
    return await this._sendRequestMessageToWorker('complete-request', content);
  }

  /**
   * Handle an `inspect_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   */
  async inspectRequest(
    content: KernelMessage.IInspectRequestMsg['content']
  ): Promise<KernelMessage.IInspectReplyMsg['content']> {
    return await this._sendRequestMessageToWorker('inspect-request', content);
  }

  /**
   * Handle an `is_complete_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   */
  async isCompleteRequest(
    content: KernelMessage.IIsCompleteRequestMsg['content']
  ): Promise<KernelMessage.IIsCompleteReplyMsg['content']> {
    return await this._sendRequestMessageToWorker('is-complete-request', content);
  }

  /**
   * Handle a `comm_info_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   */
  async commInfoRequest(
    content: KernelMessage.ICommInfoRequestMsg['content']
  ): Promise<KernelMessage.ICommInfoReplyMsg['content']> {
    return await this._sendRequestMessageToWorker('comm-info-request', content);
  }

  /**
   * Send an `input_reply` message.
   *
   * @param content - The content of the reply.
   */
  inputReply(content: KernelMessage.IInputReplyMsg['content']): void {}

  /**
   * Send an `comm_open` message.
   *
   * @param msg - The comm_open message.
   */
  async commOpen(msg: KernelMessage.ICommOpenMsg): Promise<void> {
    return await this._sendRequestMessageToWorker('comm-open', msg);
  }

  /**
   * Send an `comm_msg` message.
   *
   * @param msg - The comm_msg message.
   */
  async commMsg(msg: KernelMessage.ICommMsgMsg): Promise<void> {
    return await this._sendRequestMessageToWorker('comm-msg', msg);
  }

  /**
   * Send an `comm_close` message.
   *
   * @param close - The comm_close message.
   */
  async commClose(msg: KernelMessage.ICommCloseMsg): Promise<void> {
    return await this._sendRequestMessageToWorker('comm-close', msg);
  }

  /**
   * Send a message to the web worker
   *
   * @param type The message type to send to the worker.
   * @param data The message to send to the worker.
   */
  private async _sendRequestMessageToWorker(type: string, data: any): Promise<any> {
    this._executeDelegate = new PromiseDelegate<any>();
    this._worker.postMessage({ type, data, parent: this.parent });
    return await this._executeDelegate.promise;
  }
  private _worker: Worker;
  private _executeDelegate = new PromiseDelegate<any>();
  //private _ready = new PromiseDelegate<void>();
}

/**
 * A namespace for XeusKernel statics.
 */
export namespace XeusKernel {
  /**
   * The instantiation options for a Pyodide kernel
   */
  export interface IOptions extends IKernel.IOptions {}
}
