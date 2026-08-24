/// <reference types="fuse.js" />
import Fuse from 'fuse.js/dist/fuse.basic.esm.min';
import IFuseOptions = Fuse.IFuseOptions;
type Return<T> = {
    result: T[];
    searchStrings: string[];
};
/** Fuse search wrapper. */
export declare function handleFuseSearch<T>(search: string, items: T[], options: IFuseOptions<T>): Return<T>;
export {};
