declare module 'html-pdf-node' {
  export interface Document {
    content: string;
    path?: string;
  }

  export interface Options {
    format?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'A3' | 'A5';
    margin?: {
      top?: string | number;
      bottom?: string | number;
      left?: string | number;
      right?: string | number;
    };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    landscape?: boolean;
    pageRanges?: string;
  }

  export function generatePdf(document: Document, options?: Options): Promise<Buffer>;
}
