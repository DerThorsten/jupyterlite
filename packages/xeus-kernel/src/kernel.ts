import { KernelMessage } from '@jupyterlab/services';

import { BaseKernel, IKernel } from '@jupyterlite/kernel';

import { PromiseDelegate } from '@lumino/coreutils';

import createXeusModule from './xeus_dummy';

//import xeusModule from './xeus_dum_helmy.wasm';

export class XeusKernel extends BaseKernel implements IKernel {
  /**
   * Instantiate a new XeusKernel
   *
   * @param options The instantiation options for a new XeusKernel
   */

  xeus_mod: any;
  constructor(options: XeusKernel.IOptions) {
    super(options);
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

  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    console.log('try to locate file');
    return createXeusModule().then((mymod: any) => {
    // {
    //   locateFile(path:any) {
    //     console.log(SampleWASM)
    //     return "64e406639afafaa0e16bd93a9aa6701d.wasm"
    //     // if(path.endsWith('.wasm')) {
    //     //   return SampleWASM;
    //     // }
    //     // return path;
    //   }
    // }
      // Store the CPP library as an instance attribute
      console.log('STORE');
      this.xeus_mod = mymod;
      console.log('STORE DONE');
    });
    //return this._ready.promise;
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
    const result = await this._sendRequestMessageToWorker('execute-request', content);

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
    //this._worker.postMessage({ type, data, parent: this.parent });
    return await this._executeDelegate.promise;
  }

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
