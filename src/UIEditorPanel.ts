import * as vscode from 'vscode';

export class UIEditorPanel {
    public static currentPanel: UIEditorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private screenName:string;
    private screenPath:vscode.Uri;
    
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri,screenName:string,screenPath:vscode.Uri) {
      this._panel = panel;
      this.screenName= screenName;
      this.screenPath= screenPath;
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
      this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
      this._setWebviewMessageListener(this._panel.webview);
      this.updatePy();
    }

    public static render(extensionUri: vscode.Uri,screenName:string,screenPath:vscode.Uri) {
        if (UIEditorPanel.currentPanel) {
          UIEditorPanel.currentPanel.dispose();
        } 

          const panel = vscode.window.createWebviewPanel(screenName, screenName, vscode.ViewColumn.Two, {
            // Enable javascript in the webview
            enableScripts: true,
            // Restrict the webview to only load resources from the `out` directory
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
          });
    
          UIEditorPanel.currentPanel = new UIEditorPanel(panel,extensionUri,screenName,screenPath);
          
      }
      public dispose() {
        UIEditorPanel.currentPanel = undefined;
    
        this._panel.dispose();
    
        while (this._disposables.length) {
          const disposable = this._disposables.pop();
          if (disposable) {
            disposable.dispose();
          }
        }
      }
      private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        const webviewUri = getUri(webview, extensionUri, ["media" ,"conva.min.js"]);
        const mainJsUri = getUri(webview, extensionUri, ["media" ,"main.js"]);
        const nonce = getNonce();
        const stylesMainUri = getUri(webview, extensionUri, ["media" ,"main.css"]);
        return /*html*/ `
          <!DOCTYPE html>
          <html lang="en">
            <head>

              <meta charset="UTF-8">
              <meta charset="utf-8" />
              <title>Konva Select and Transform Demo</title>
              <link  rel="stylesheet" nonce="${nonce}" href="${stylesMainUri}">
            </head>
          
            <body>
              <div class="tools">
              <button id="rect" class="shape-btn" value="RECT">&#9645;</button>
              <button id="straightLine" class="shape-btn" value="STARIGHTLINE">&#9586;</button>
              <button id="addText" class="shape-btn" value="ADDTEXT" style="margin-right:2rem;">T</button>
              <input type="color" value="#afafaf" name="colorselection" id="colorselection">
              <button id="delete">&#10761;</button>
              </div>
              <div class="main">
                <div id="container"></div>
              </div>
              <script type="text/javaScript" nonce="${nonce}" src="${webviewUri}"></script>
              <script type="text/javaScript" nonce="${nonce}" src="${mainJsUri}"></script>
            </body>
          </html>
        `;
      }
      private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
          (message: any) => {
              this.updatePy(message);
            // if(message.name==='rect'){
            //   let currentEditors = vscode.window.visibleTextEditors;
            //   let currentEditor = currentEditors.filter(te=>te.document.fileName.endsWith(".py"))[0];
            //     currentEditor?.edit((editBuidler:vscode.TextEditorEdit)=>{
            //       // editBuidler.insert(new vscode.Position(0,0),`import display\ndisplay.Rectangle(${Math.round(message.x)},${Math.round(message.y)},${Math.round(message.x+message.width)},${Math.round(message.y+message.height)},display.RED)\n`);
            //       editBuidler.replace(new vscode.Position(0,0),"")
            //     });
            //     currentEditor.options.lineNumbers
            // }
          },
          undefined,
          this._disposables
        );
      }

      public async updatePy(data:object[]=[]){
        let pystring = gUItoPython(data,this.screenName);
        vscode.workspace.fs.writeFile(this.screenPath,Buffer.from(pystring));
      }
  }

  export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
  }
  export function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }


  function gUItoPython(data:object[],screenName:string){
      const initialMessage = '# GENERATED BRILLIANT AR STUDIO Do not modify this file directly\nimport display as d\n\n';
      let finalPyString ="";
      if(data.length===0){
        finalPyString += initialMessage +  'class '+screenName+':\n\tpass';
      }else{
        finalPyString += initialMessage +  'class '+screenName+':\n\tblocks = [';
      }
      data.forEach((uiElement:any,index:number)=>{
        if(uiElement.name==='rect'){
          finalPyString += `\n\td.Rectangle(${Math.round(uiElement.x)}, ${Math.round(uiElement.y)}, ${Math.round(uiElement.x+uiElement.width)}, ${Math.round(uiElement.y+uiElement.height)}, 0x${uiElement.fill.replace("#","")}),`;
        }
        if(uiElement.name==='line'){
          finalPyString += `\n\td.Line(${Math.round(uiElement.points[0])}, ${Math.round(uiElement.points[1])}, ${Math.round(uiElement.points[2])}, ${Math.round(uiElement.points[3])}, 0x${uiElement.stroke.replace("#","")}, thickness=${uiElement.strokeWidth}),`;

        }
      });
      if(data.length!==0){
        finalPyString +='\n\t]';
      }
      return finalPyString;

  }