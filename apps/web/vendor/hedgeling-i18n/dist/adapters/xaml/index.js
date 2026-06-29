import { identifyXamlHits } from "./identify.js";
// Adapter: XAML markup (.xaml for WPF/WinUI/MAUI/UWP, .axaml for Avalonia).
// Extraction only; applied at runtime via the source catalog / resource export,
// like the HTML and Vue adapters.
export const xamlAdapter = {
    name: "xaml",
    extensions: [".xaml", ".axaml"],
    identify: (source) => identifyXamlHits(source),
};
export * from "./identify.js";
