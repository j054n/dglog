import { exec, ChildProcess } from 'child_process';
import { emptyDirSync, ensureDir, readFileSync } from 'fs-extra';

import * as vscode from 'vscode';
import * as path from 'path';

const CHANNEL_NAME      = "Icarus Output";
const OPTION_OPEN       = "Open in GTKWave";

// Config
class ConfigManager {
    get config()    { return vscode.workspace.getConfiguration("verilog"); }
    get glob()      { return this.config.get<string>('gtkwaveWatchGlob') || ''; }
    get args()      { return this.config.get<string>('icarusCompileArguments') || ''; }
    get build()     { return this.config.get<string>('icarusBuildDirectory') || ''; }
    get presist()   { return this.config.get<boolean>('icarusPersistentBuild') || false; }
    get includes()  { return this.config.get<string[]>('icarusTestbenchIncludes') || []; }
    get incpwd()    { return this.config.get<boolean>('icarusTestbenchIncludePwd') || false; }
}
const CONFIG = new ConfigManager();

function getWorkspaceCwd(fileUri: vscode.Uri | null = null): string {
    if (!fileUri) {
        // TODO: Something goes here
        return "";
    }

    let cwd: string = vscode.workspace.getWorkspaceFolder(fileUri)?.uri.fsPath || "";
    if (!cwd) {
        cwd = path.dirname(fileUri.fsPath);
    }
    return cwd;
}

export class Runner implements vscode.Disposable {
    private output: vscode.OutputChannel;
    private procCompile: ChildProcess | undefined;
    private procExec: ChildProcess | undefined;
    private procGtk: ChildProcess | undefined; //Map<string, ChildProcess>;

    private watcher: vscode.FileSystemWatcher | undefined;

    // Persistent out
    private out: string = "";

    constructor() {
        this.output = vscode.window.createOutputChannel(CHANNEL_NAME);
        //this.procGtk = new Map<string, ChildProcess>();
    }

    public async compile(fileUri: vscode.Uri) {
        // Avoid leaky asses
        if (this.procCompile || this.procExec) {
            vscode.window.showErrorMessage("An existing compilation/execution is still running!");
            return;
        }

        this.output.show(true);

        let cwd = getWorkspaceCwd(fileUri);

        if (CONFIG.build !== '') {
            ensureDir(path.resolve(cwd, CONFIG.build));
        }

        if (!CONFIG.presist) {
            emptyDirSync(path.resolve(cwd, CONFIG.build));
        }

        let outputFileUri = path.join(CONFIG.build, `${path.basename(fileUri.fsPath)}.out`);
        let inputFileUri = path.relative(cwd, fileUri.fsPath);
        let includeArgs = (CONFIG.incpwd ? `-I${path.dirname(inputFileUri)}` : '')
            + CONFIG.includes.reduce((v, x) => `${v} -I${x}`, '');
        
        let cmd: string = `iverilog ${CONFIG.args} ${includeArgs} -o ${outputFileUri} ${inputFileUri}`;

        this.output.appendLine(` > ${cmd} \n`);
        this.procCompile = exec(cmd, { cwd: cwd });
        this.procCompile.stdout?.on("data", d => this.output.append(d));
        this.procCompile.stderr?.on("data", d => this.output.append(d));
        this.procCompile.on("close", c => {
            this.procCompile = undefined;
            this.output.appendLine(`Compilation finished with exit code ${c}`);

            if (c === 0) {
                // Let it execute in the build folder now
                let absOut = path.resolve(cwd, outputFileUri);
                let newCwd = path.dirname(absOut);
                this.execute(path.relative(newCwd, absOut), newCwd);
            } else {
                vscode.window.showErrorMessage(`Compilation failed with ${c} errors.`);
            }
        });
    }

    private async execute(fileUri: string, cwd: string) {
        this.destroyWatcher();

        await new Promise(r => setTimeout(r, 1000));

        let cmd = `vvp ${fileUri}`;
        this.output.appendLine(` > ${cmd} \n`);

        this.procExec = exec(cmd, { cwd: cwd });
        this.procExec.stdout?.on("data", d => this.output.append(d));
        this.procExec.stderr?.on("data", d => this.output.append(d));
        this.procExec.on("close", c => {
            if (c !== 0) {
                vscode.window.showErrorMessage(`Execution failed with exit code ${c}.`);
            }
            this.procExec = undefined;
            this.output.appendLine(`Execution finished with exit code ${c}`);
            // We cannot destroy watcher here due to race conditions.
            // Avoid synchronization when possible.
        });

        await new Promise(r => setTimeout(r, 1000));

        let vcd = await vscode.workspace.findFiles(CONFIG.glob, null, 1);
        if (vcd.length !== 0) {
            let vcduri = path.relative(cwd, vcd[0].fsPath);//
            let cmdvcd = `gtkwave ${vcduri}`;//
            this.output.appendLine(`Trying GTKWave with file ${vcduri}`);//this.output.appendLine(`Trying GTKWave with file ${vcd[0].path}`);
            this.procGtk = exec(cmdvcd, { cwd: cwd });//this.procGtk = exec(`gtkwave ${vcd[0].path}`);
            this.procGtk = undefined;
        }
    }

    public stop(cwd: string | null) {
        const treeKill = require('tree-kill');
        if (this.procCompile) {
            treeKill(this.procCompile.pid);
            this.procCompile = undefined;
            this.output.appendLine("Killed compiler.");
        }

        if (this.procExec) {
            treeKill(this.procExec.pid);
            this.procExec = undefined;
            this.output.appendLine("Killed executer.");
        }

        if (cwd) {
            emptyDirSync(path.resolve(cwd, CONFIG.build));
            this.output.appendLine("Cleaned build directory.");
        }

        this.watcher?.dispose();
        this.watcher = undefined;
    }

    private destroyWatcher() {
        if (!this.procExec) {
            this.watcher?.dispose();
            this.watcher = undefined;
        }
    }

    dispose() {
        this.stop(null);
    }
}