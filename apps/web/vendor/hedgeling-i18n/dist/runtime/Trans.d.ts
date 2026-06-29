import { type ReactElement, type ReactNode } from "react";
/**
 * Renders a translatable message that contains inline markup. The Vite plugin
 * emits this automatically for elements like <p>Click <a>here</a></p>; developers
 * never write it by hand. Translators translate the message (keeping the <0>..</0>
 * placeholders), and the original elements are reused via cloneElement.
 */
export declare function Trans({ message, components, values, }: {
    message: string;
    components?: ReactElement[];
    values?: Record<string, ReactNode>;
}): import("react").FunctionComponentElement<{
    children?: ReactNode | undefined;
}>;
