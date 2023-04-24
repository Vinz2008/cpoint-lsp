import * as os from "os";
import * as path from "path";
import {isFileAtPath} from "./util";

export function memoizeAsync<Ret, TThis, Param extends string>(
    func: (this: TThis, arg: Param) => Promise<Ret>
) {
    const cache = new Map<string, Ret>();

    return async function (this: TThis, arg: Param) {
        const cached = cache.get(arg);
        if (cached) return cached;

        const result = await func.call(this, arg);
        cache.set(arg, result);

        return result;
    };
}


export const getPathForExecutable = memoizeAsync(
    // We apply caching to decrease file-system interactions
    async (executableName: "cpoint-build" | "cpoint"): Promise<string> => {
        {
            const envVar = process.env[executableName.toUpperCase()];
            if (envVar) return envVar;
        }

        if (await lookupInPath(executableName)) return executableName;
        return executableName;
    }
);

export async function lookupInPath(exec: string): Promise<boolean> {
    const paths = process.env.PATH ?? "";

    const candidates = paths.split(path.delimiter).flatMap((dirInPath) => {
        const candidate = path.join(dirInPath, exec);
        return os.type() === "Windows_NT" ? [candidate, `${candidate}.exe`] : [candidate];
    });

    for await (const isFile of candidates.map(isFileAtPath)) {
        if (isFile) {
            return true;
        }
    }
    return false;
}
