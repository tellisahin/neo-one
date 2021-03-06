/* @flow */
import type { CLIArgs } from '@neo-one/server-plugin';

import { distinct, map } from 'rxjs/operators';
import path from 'path';

import createFullNode from './createFullNode';
import { createNEOONENodeConfig } from './node';

export default ({
  vorpal,
  log,
  shutdown,
  shutdownFuncs,
  logConfig$,
}: CLIArgs) => {
  vorpal
    .command('start node <dataPath>', `Starts a full node`)
    .option(
      '-c, --chain <chain>',
      'Path of a chain.acc file to bootstrap the node',
    )
    .action(async args => {
      const { dataPath, options: cliOptions } = args;

      const nodeConfig = createNEOONENodeConfig({ dataPath, log });

      const logPath = path.resolve(dataPath, 'log');
      const logSubscription = nodeConfig.config$
        .pipe(
          map(config => config.log),
          distinct(),
          map(config => ({
            name: 'node',
            path: logPath,
            level: config.level,
            maxSize: config.maxSize,
            maxFiles: config.maxFiles,
          })),
        )
        .subscribe(logConfig$);
      shutdownFuncs.push(() => logSubscription.unsubscribe());

      let chainFile;
      if (cliOptions.chain != null) {
        chainFile = cliOptions.chain;
      }
      const node = await createFullNode({
        dataPath,
        nodeConfig,
        log,
        chainFile,
        onError: error => {
          log({ event: 'UNCAUGHT_NODE_ERROR', error });
          shutdown({ exitCode: 1, error });
        },
      });
      node.start();
      shutdownFuncs.push(() => node.stop());
    });
};
