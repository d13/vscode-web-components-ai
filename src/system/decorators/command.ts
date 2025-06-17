import { deferRegisteredCommand } from '../../system/command';
import type { CommandConstructor } from '../../system/command';
// import type { Commands } from '../../constants';

// Boo, can't use decorators directly on functions
// export function command(commands: Commands | Commands[]) {
//   return (target: DeferredCommand['callback']) => {
//     deferRegisteredCommand(commands, target);

//     return target;
//   };
// }

export function command<T extends CommandConstructor>() {
  return (target: T) => {
    deferRegisteredCommand(target);

    return target;
  };
}
