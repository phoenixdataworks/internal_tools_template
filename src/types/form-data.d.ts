declare module 'form-data' {
  class FormData {
    append(field: string, value: any, options?: { filename?: string; contentType?: string }): void;
    getHeaders(): { [key: string]: string };
  }
  export = FormData;
}
