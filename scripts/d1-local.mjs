import {DatabaseSync} from 'node:sqlite';
export function d1Adapter(db){return {prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){const info=db.prepare(sql).run(...args);return {meta:{changes:Number(info.changes)}}}}}}}
export {DatabaseSync};
