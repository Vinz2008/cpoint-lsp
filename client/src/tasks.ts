import * as vscode from 'vscode';
import {getPathForExecutable} from "./toolchain";

export interface CpointBuildTaskDefinition extends vscode.TaskDefinition {
    command?: string;
    args?: string[];
    cwd?: string;
    env?: { [key: string]: string };
}

export const TASK_TYPE = "cpoint-build";
export const TASK_SOURCE = "cpoint-lsp";

class CpointTaskProvider implements vscode.TaskProvider {
  
    async provideTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];
        const defs = [
            { command: "build", group: vscode.TaskGroup.Build },
            { command: "clean", group: vscode.TaskGroup.Clean },
            { command: "run", group: undefined },
        ];
        for (const workspaceTarget of vscode.workspace.workspaceFolders || []){
            for (const def of defs){
                const vscodeTask = await buildFolderBuildTask(workspaceTarget, { type: TASK_TYPE, command: def.command }, `cpoint-build ${def.command}`, [""]);
                vscodeTask.group = def.group;
                tasks.push(vscodeTask);
            }
        }
        return tasks;
    }
    async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
        const definition = task.definition as CpointBuildTaskDefinition;

        if (definition.type === TASK_TYPE && definition.command) {
            const args = [definition.command].concat(definition.args ?? []);
            return await buildFolderBuildTask(
                task.scope,
                definition,
                task.name,
                args,
            );
        }

        return undefined;
    }
}

export async function buildFolderBuildTask(
    scope: vscode.WorkspaceFolder | vscode.TaskScope | undefined,
    definition: CpointBuildTaskDefinition,
    name: string, 
    args: string[],
) : Promise<vscode.Task>{
    let exec: vscode.ProcessExecution | vscode.ShellExecution | undefined = undefined;
    if (!exec){
        const cpointBuildPath = await getPathForExecutable("cpoint-build");
        const command = [cpointBuildPath];
        const fullCommand = [...command, ...args];
        exec = new vscode.ProcessExecution(fullCommand[0], fullCommand.slice(1), definition);
    }
    return new vscode.Task(definition, scope ?? vscode.TaskScope.Workspace, name, TASK_SOURCE);
}