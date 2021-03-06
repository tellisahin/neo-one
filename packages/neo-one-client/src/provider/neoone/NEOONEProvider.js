/* @flow */
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import type BigNumber from 'bignumber.js';
import type { Observable } from 'rxjs/Observable';

import type {
  AddressString,
  GetOptions,
  Hash256String,
  Input,
  RawInvocationData,
  RawInvocationResult,
  NetworkSettings,
  NetworkType,
  Transaction,
  TransactionReceipt,
  UnspentOutput,
} from '../../types'; // eslint-disable-line
import NEOONEDataProvider from './NEOONEDataProvider';
import { UnknownNetworkError } from '../../errors';

import * as networkConfigs from '../../networks';

export type ProviderOptions = {|
  network: NetworkType,
  rpcURL: string,
|};

export default class NEOONEProvider {
  networks$: Observable<Array<NetworkType>>;
  _networks$: BehaviorSubject<Array<NetworkType>>;

  _providers: { [type: string]: NEOONEDataProvider };

  constructor({
    mainRPCURL: mainRPCURLIn,
    testRPCURL: testRPCURLIn,
    options,
  }: {|
    mainRPCURL?: string,
    testRPCURL?: string,
    options?: Array<ProviderOptions>,
  |}) {
    this._networks$ = new BehaviorSubject([]);
    this.networks$ = this._networks$;
    this._providers = {};

    let hasMain = false;
    let hasTest = false;
    const networks = (options || []).map(({ network, rpcURL }) => {
      if (network === networkConfigs.MAIN) {
        hasMain = true;
      }

      if (network === networkConfigs.TEST) {
        hasTest = true;
      }

      this._providers[network] = new NEOONEDataProvider({
        network,
        rpcURL,
      });

      return network;
    });

    if (!hasMain) {
      const mainRPCURL =
        mainRPCURLIn == null ? networkConfigs.MAIN_URL : mainRPCURLIn;
      this._providers.main = new NEOONEDataProvider({
        network: networkConfigs.MAIN,
        rpcURL: mainRPCURL,
      });
      networks.push(networkConfigs.MAIN);
    }

    if (!hasTest) {
      const testRPCURL =
        testRPCURLIn == null ? networkConfigs.TEST_URL : testRPCURLIn;
      this._providers.test = new NEOONEDataProvider({
        network: networkConfigs.TEST,
        rpcURL: testRPCURL,
      });
      networks.push(networkConfigs.TEST);
    }

    this._networks$.next(networks);
  }

  getNetworks(): Array<NetworkType> {
    return this._networks$.getValue();
  }

  addNetwork({
    network,
    rpcURL,
  }: {|
    network: NetworkType,
    rpcURL: string,
  |}): void {
    if (!this._networks$.value.some(net => network === net)) {
      this._providers[network] = new NEOONEDataProvider({ network, rpcURL });
      const networks = [...this._networks$.value];
      networks.push(network);
      this._networks$.next(networks);
    }
  }

  getUnclaimed(
    network: NetworkType,
    address: AddressString,
  ): Promise<{| unclaimed: Array<Input>, amount: BigNumber |}> {
    return this._getProvider(network).getUnclaimed(address);
  }

  getUnspentOutputs(
    network: NetworkType,
    address: AddressString,
  ): Promise<Array<UnspentOutput>> {
    return this._getProvider(network).getUnspentOutputs(address);
  }

  relayTransaction(
    network: NetworkType,
    transaction: string,
  ): Promise<Transaction> {
    return this._getProvider(network).relayTransaction(transaction);
  }

  getTransactionReceipt(
    network: NetworkType,
    hash: Hash256String,
    options?: GetOptions,
  ): Promise<TransactionReceipt> {
    return this._getProvider(network).getTransactionReceipt(hash, options);
  }

  getInvocationData(
    network: NetworkType,
    hash: Hash256String,
  ): Promise<RawInvocationData> {
    return this._getProvider(network).getInvocationData(hash);
  }

  testInvoke(
    network: NetworkType,
    transaction: string,
  ): Promise<RawInvocationResult> {
    return this._getProvider(network).testInvoke(transaction);
  }

  getNetworkSettings(network: NetworkType): Promise<NetworkSettings> {
    return this._getProvider(network).getNetworkSettings();
  }

  _getProvider(network: NetworkType): NEOONEDataProvider {
    const provider = this._providers[network];
    if (provider == null) {
      throw new UnknownNetworkError(network);
    }

    return provider;
  }
}
