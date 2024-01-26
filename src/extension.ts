import * as vscode from 'vscode';
import { Runner } from './runner';

const ICARUS_CMD_RUN = 'dglog.run';
const ICARUS_CMD_STOP = 'dglog.stop';

let run = new Runner();
let status: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	let cmdrun = vscode.commands.registerCommand(ICARUS_CMD_RUN, (fileUri: vscode.Uri) => {
		run.compile(fileUri);
	});
	let cmdstop = vscode.commands.registerCommand(ICARUS_CMD_STOP, (fileUri: vscode.Uri) => {
		run.stop(vscode.workspace.getWorkspaceFolder(fileUri)?.uri.fsPath || null);
	});
	context.subscriptions.push(cmdrun);
	context.subscriptions.push(cmdstop);
}

export function deactivate() {
	run.dispose();
}
