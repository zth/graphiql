declare module 'graphql-language-service-utils' {
  export interface PositionInterface {
    line: number;
    character: number;
    lessThanOrEqualTo: (position: PositionInterface) => boolean;
  }
  export class Position implements PositionInterface {
    line: number;
    character: number;
    constructor(line: number, character: number)
    setLine(line: number): void
    setCharacter(character: number): void
    lessThanOrEqualTo (position: PositionInterface): boolean
  }
}
