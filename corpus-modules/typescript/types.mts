export interface Shape { area(): number; readonly name: string }
export type Id = number | string;
export namespace Geometry { export interface Point { x: number; y: number } export type Pair = [Point, Point]; }
export enum Color { Red, Green = 5, Blue }
export enum Tone { Warm = 'warm', Cool = 'cool' }
export declare const ambient: number;
export const realValue: number = 42;
