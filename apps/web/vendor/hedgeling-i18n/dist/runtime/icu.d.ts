export type IcuValue = string | number | boolean | null | undefined;
export type IcuValues = Record<string, IcuValue>;
export declare function simpleInterpolate(source: string, values?: IcuValues): string;
export declare function formatMessage(message: string, values: IcuValues | undefined, locale: string): string;
