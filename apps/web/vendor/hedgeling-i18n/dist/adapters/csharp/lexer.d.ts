export type CSharpString = {
    value: string;
    start: number;
    end: number;
    interpolated: boolean;
};
export declare function lexCSharpStrings(source: string): CSharpString[];
