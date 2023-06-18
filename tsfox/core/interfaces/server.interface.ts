export interface IServer {
    get(path: string, callback: any): any;
    post(path: string, callback: any): any;
    put(path: string, callback: any): any;
    delete(path: string, callback: any): any;
    patch(path: string, callback: any): any;
    all(path: string, callback: any): any;
    set(setting: string, value: any): any;
    use(callback: any): void;
}